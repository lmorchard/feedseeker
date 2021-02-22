/* global RSSParser */
import config from "./config";
import setupLog from "./log";
import Store from "./store";
import { createQueue, queues } from "./queues";
import { hashStringAsID } from "./utils";

const {
  DEBUG,
  FEED_POLL_CONCURRENCY,
  FEED_POLL_INTERVAL,
  FEED_POLL_TIMEOUT,
  USER_AGENT,
  DISPLAY_MAX_AGE,
} = config();

const log = setupLog("lib/feeds");

export async function setupFeeds({ broadcastMessage }) {
  log.trace("setupFeeds");

  setInterval(pollAllFeeds, FEED_POLL_INTERVAL);

  createQueue("feedPollQueue", {
    concurrency: FEED_POLL_CONCURRENCY,
    onStart: () => {
      log.info("feedPollQueue start");
      broadcastMessage("appPage", "feedPollStart");
    },
    onTask: pollOneFeed,
    onResolve: (result, task, taskId) => {
      log.trace("feedPollQueue resolve", taskId, task, result);
    },
    onReject: (result, task, taskId) => {
      log.error("feedPollQueue error", taskId, task, result);
    },
    onDone: async () => {
      log.info("feedPollQueue done");
      await updateAggregatedFeedItems();
      broadcastMessage("appPage", "feedPollDone");
    },
  });
}

// TODO: Refine this naive feed discovery.
// Maybe also detect whether the current document is a feed and just use sourceUrl
// Also, these are terrible REs but they seem to catch interesting things
const feedLinkHrefRE = new RegExp(/feed(?!back)|rss|atom|xml/, "i");
const feedLinkTitleRE = new RegExp(/feed(?!back)|rss|atom|xml/, "i");
export function findFeeds(sourceUrl, sourceTitle, document) {
  const fromDocHead = Array.from(
    document.head.querySelectorAll(
      'link[type*="rss"], link[type*="atom"], link[type*="rdf"]'
    )
  ).map((link) => ({
    title: link.getAttribute("title"),
    href: new URL(link.getAttribute("href"), sourceUrl).toString(),
  }));

  const fromLinks = [];
  const allLinks = Array.from(document.body.querySelectorAll("a"));
  for (const link of allLinks) {
    const href = link.getAttribute("href");
    if (!href) continue;

    const title = link.getAttribute("title") || link.textContent;

    if (feedLinkHrefRE.test(href) || feedLinkTitleRE.test(title)) {
      fromLinks.push({
        title: link.getAttribute("title") || link.textContent,
        href: new URL(link.getAttribute("href"), sourceUrl).toString(),
      });
    }
  }

  // Annotate all the candidates with the current source page URL & title
  const links = [...fromDocHead, ...fromLinks].map((link) => ({
    ...link,
    sourceUrl,
    sourceTitle,
  }));

  // Reduce down to unique href feeds discovered
  return links.filter((e, i) => links.findIndex((a) => a.href === e.href) == i);
}

export async function followFeed(feed) {
  log.trace("followFeed", feed);

  const feedID = await Store.feedToID(feed);
  const ignoredFeedIDs = await Store.getIgnoredFeedIDs();
  if (ignoredFeedIDs.includes(feedID)) {
    log.verbose("ignoring follow for feed", feed);
    return;
  }

  // Try fetching & parsing the feed - ignore if we fail.
  try {
    await fetchFeed(feed);
  } catch (error) {
    await Store.addIgnoredFeedID(feedID);
    log.error("failed to follow feed - ignoring", feedID, feed, error);
    return;
  }

  await Store.updateFeed(feed, (update) => ({
    ...update,
    followedAt: update.followedAt || new Date().toISOString(),
    seenCount: (update.seenCount || 0) + 1,
  }));
  await pollOneFeed(feedID);
}

export async function fetchFeed(feed) {
  log.trace("fetchFeed", feed.href);
  const controller = new AbortController();
  const abortTimeout = setTimeout(() => controller.abort(), FEED_POLL_TIMEOUT);
  const response = await fetch(feed.href, {
    method: "GET",
    headers: {
      "user-agent": USER_AGENT,
    },
    signal: controller.signal,
  });
  clearTimeout(abortTimeout);
  const data = await response.text();
  const parser = new RSSParser();
  const parsed = await parser.parseString(data);
  return { ...feed, ...parsed, raw: "" + data };
}

export async function pollAllFeeds() {
  log.trace("pollAllFeeds");
  const ignoredFeedIDs = await Store.getIgnoredFeedIDs();
  const feedIDs = await Store.getFeedIDs();
  for (const feedID of feedIDs) {
    if (ignoredFeedIDs.includes(feedID)) continue;
    queues.feedPollQueue.push(feedID);
  }
}

export async function pollOneFeed(feedID) {
  log.trace("pollOneFeed", feedID);

  const feed = await Store.getFeed(feedID);
  if (!feed) {
    log.error("No such feed for ID", feedID);
    return;
  }

  const fetchedFeed = await fetchFeed(feed);

  const timeNow = new Date().toISOString();

  const existingItems = await annotateItemsWithIDs(feed.items);
  const existingIDs = new Set(existingItems.map((item) => item.id));

  const fetchedItems = await annotateItemsWithIDs(fetchedFeed.items);
  const fetchedIDs = new Set(fetchedItems.map((item) => item.id));

  const newItems = fetchedItems
    .filter((item) => !existingIDs.has(item.id))
    .map((item) => ({
      ...item,
      firstSeenDate: item.firstSeenDate || timeNow,
    }));
  const newIDs = new Set(newItems.map((item) => item.id));

  // defunct items are items we saw in the past but are no longer in the feed
  // TODO: eventually expire these from the store
  const defunctItems = existingItems.filter((item) => !fetchedIDs.has(item.id));
  const defunctIDs = new Set(defunctItems.map((item) => item.id));

  const mergedItems = [...newItems, ...existingItems].map((item) => ({
    ...item,
    isNew: newIDs.has(item.id),
    isDefunct: defunctIDs.has(item.id),
    defunctSince: defunctIDs.has(item.id) ? item.defunctSince || timeNow : null,
  }));

  mergedItems.sort((a, b) => getItemTime(b) - getItemTime(a));

  let lastNewAt = feed.lastNewAt;
  if (newItems.length) {
    lastNewAt = timeNow;
  } else if (!lastNewAt && mergedItems.length) {
    lastNewAt = new Date(getItemTime(mergedItems[0])).toISOString();
  }

  await Store.updateFeed(feed, (update) => ({
    ...update,
    ...fetchedFeed,
    items: mergedItems,
    fetchedCount: (update.fetchedCount || 0) + 1,
    lastFetchedAt: timeNow,
    lastNewAt,
  }));

  queues.discoverThumbQueue.push(feedID);
}

export async function updateAggregatedFeedItems() {
  DEBUG && console.time("updateAggregatedFeedItems");

  const feedIDs = await Store.getFeedIDs();
  const ignoredFeedIDs = await Store.getIgnoredFeedIDs();
  const itemCutoffTime = Date.now() - DISPLAY_MAX_AGE;
  const items = [];

  for (const feedID of feedIDs) {
    if (ignoredFeedIDs.includes(feedID)) continue;
    const feed = await Store.getFeed(feedID);
    if (!feed) {
      log.error("No such feed for ID", feedID);
      continue;
    }
    if (feed.items) {
      for (const item of feed.items) {
        if (getItemTime(item) > itemCutoffTime) {
          items.push({ ...item, feed });
        }
      }
    }
  }

  await Store.setAggregatedFeedItems(items);

  DEBUG && console.timeEnd("updateAggregatedFeedItems");
}

const itemID = async ({ title, link, guid }) =>
  hashStringAsID(`${title}|${link}|${guid}`);

async function annotateItemsWithIDs(items = []) {
  const out = [];
  for (const item of items) {
    out.push({ ...item, id: await itemID(item) });
  }
  return out;
}

export function getItemTime(item) {
  // HACK: some feeds seem to have dates in the future, so try to constrain
  // that to the time we first saw the item instead.
  const { firstSeenDate, isoDate } = item;
  return new Date(
    !isoDate || isoDate > firstSeenDate ? firstSeenDate : isoDate
  ).getTime();
}
