/* global RSSParser */
import setupLog from "../lib/log";
import Store from "../lib/store";
import { createQueue, queues } from "../lib/queues";

const log = setupLog("lib/feeds");

export async function setupFeeds() {
  log.trace("setupFeeds");
  createQueue("feedPollQueue", {
    concurrency: 4,
    onTask: pollOneFeed,
    onResolve: (result, task, taskId) => {
      console.debug("resolve", taskId, task, result);
    },
    onReject: (result, task, taskId) => {
      console.debug("reject", taskId, task, result);
    },
  });
}

// TODO: Refine this naive feed discovery
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
  return { ...feed, ...parsed, raw: data };
}

export async function pollOneFeed(feed) {
  log.trace("pollOneFeed", feed.href);
  const fetchedFeed = await fetchFeed(feed);
  await Store.updateFeed(feed, (update) => ({
    ...update,
    ...fetchedFeed,
    fetchedCount: (update.fetchedCount || 0) + 1,
  }));
}

export async function pollAllFeeds() {
  log.trace("pollAllFeeds");
  const feedIDs = await Store.getFeedIDs();
  for (const feedID of feedIDs) {
    const feed = await Store.getFeed(feedID);
    queues.feedPollQueue.push(feed);
  }
}
