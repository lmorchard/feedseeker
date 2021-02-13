//import Parser from "rss-parser";
import setupLog from "../lib/log";

const log = setupLog("lib/feeds");

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
  log.debug("fetchFeed", feed.href);
  const response = await fetch(feed.href);
  const data = await response.text();
  //const parser = new Parser();
  //const feedParsed = await parser.parseString(data);
  return { ...feed, data };
}
