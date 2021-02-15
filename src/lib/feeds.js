/* global RSSParser */
import config from "./config";
import setupLog from "./log";
import Store from "./store";
import { createQueue, queues } from "./queues";
import { hashStringAsID } from "./utils";

const { FEED_POLL_CONCURRENCY } = config();
const log = setupLog("lib/feeds");

export async function setupFeeds() {
  log.trace("setupFeeds");
  createQueue("feedPollQueue", {
    concurrency: FEED_POLL_CONCURRENCY,
    onTask: pollOneFeed,
    onResolve: (result, task, taskId) => {
      log.trace("feedPollQueue resolve", taskId, task, result);
    },
    onReject: (result, task, taskId) => {
      log.error("feedPollQueue error", taskId, task, result);
    },
    onDone: () => {
      log.info("feedPollQueue done");
    },
  });
}

// TODO: Refine this naive feed discovery.
// Maybe also detect whether the current document is a feed and just use sourceUrl
// Could be nice to peek through all links on the page for anything that sounds like RSS
export const findFeeds = (sourceUrl, sourceTitle, document) =>
  Array.from(
    document.head.querySelectorAll(
      'link[type*="rss"], link[type*="atom"], link[type*="rdf"]'
    )
  ).map((link) => ({
    sourceUrl,
    sourceTitle,
    title: link.getAttribute("title"),
    href: new URL(link.getAttribute("href"), sourceUrl).toString(),
  }));

export async function fetchFeed(feed) {
  log.trace("fetchFeed", feed.href);
  const response = await fetch(feed.href);
  const data = await response.text();
  const parser = new RSSParser();
  const parsed = await parser.parseString(data);
  return { ...feed, ...parsed, raw: "" + data };
}

export async function pollAllFeeds() {
  log.trace("pollAllFeeds");
  const feedIDs = await Store.getFeedIDs();
  const ignoredFeedIDs = await Store.getIgnoredFeedIDs();
  for (const feedID of feedIDs) {
    if (ignoredFeedIDs.includes(feedID)) continue;
    queues.feedPollQueue.push(feedID);
  }
}

export async function pollOneFeed(feedID) {
  log.trace("pollOneFeed", feedID);

  const feed = await Store.getFeed(feedID);
  const fetchedFeed = await fetchFeed(feed);

  const existingItems = await annotateItemsWithIDs(feed.items);
  const existingIDs = new Set(existingItems.map((item) => item.id));

  const fetchedItems = await annotateItemsWithIDs(fetchedFeed.items);
  const fetchedIDs = new Set(fetchedItems.map((item) => item.id));

  const newItems = fetchedItems.filter((item) => !existingIDs.has(item.id));
  const newIDs = new Set(newItems.map((item) => item.id));

  const defunctItems = existingItems.filter((item) => !fetchedIDs.has(item.id));
  const defunctIDs = new Set(defunctItems.map((item) => item.id));

  const mergedItems = [...newItems, ...existingItems].map((item) => ({
    ...item,
    isNew: newIDs.has(item.id),
    isDefunct: defunctIDs.has(item.id),
  }));

  await Store.updateFeed(feed, (update) => ({
    ...update,
    ...fetchedFeed,
    fetchedCount: (update.fetchedCount || 0) + 1,
    items: mergedItems,
  }));

  queues.discoverThumbQueue.push(feedID);
}

const itemID = async ({ title, link, guid }) =>
  hashStringAsID(`${title}|${link}|${guid}`);

async function annotateItemsWithIDs(items = []) {
  const out = [];
  for (const item of items) {
    out.push({ ...item, id: await itemID(item)})
  }
  return out;
}
