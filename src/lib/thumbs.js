// # Thumb Extractor
//
// Handy for extracting thumbs from the web.
//
// Based on ancient code from
// https://github.com/lmorchard/thumb-extractor
import config from "./config";
import setupLog from "./log";
import Store from "./store";
import { createQueue, queues } from "./queues";

const {
  USER_AGENT,
  DISCOVER_THUMB_CONCURRENCY,
  DISCOVER_THUMB_TIMEOUT,
} = config();

const log = setupLog("lib/thumbs");

// TODO: Move these constants into config
const REJECTED_URLS = [
  "http://graphics8.nytimes.com/images/common/icons/t_wb_75.gif",
  "https://s0.wp.com/i/blank.jpg",
  "https://www.techmeme.com/img/techmeme_sq328.png",
  "https://www.arcade-museum.com/images/klov_big_logo_crop_250_20PerEdge.jpg",
  "https://vowe.net/assets/vowe201903.jpg",
];

const REJECTED_RES = [
  ".*doubleclick.net.*",
  ".*indieclick.com.*",
  ".*blank.jpg.*",
];

export const _cache = {};

export async function setupThumbs() {
  log.trace("setupFeeds");
  createQueue("discoverThumbQueue", {
    concurrency: DISCOVER_THUMB_CONCURRENCY,
    onTask: discoverThumbsForFeed,
    onResolve: (result, task, taskId) => {
      log.trace("resolve", taskId, task, result);
    },
    onReject: (result, task, taskId) => {
      log.error("error", taskId, task, result);
    },
    onDone: () => {
      log.info("done");
    },
  });
}

export async function discoverThumbsForAllFeeds() {
  log.trace("discoverThumbsForAllFeeds");
  const feedIDs = await Store.getFeedIDs();
  for (const feedID of feedIDs) {
    queues.discoverThumbQueue.push(feedID);
  }
}

export async function discoverThumbsForFeed(feedID) {
  const feed = await Store.getFeed(feedID);
  if (!feed) {
    log.error("No such feed for ID", feedID);
    return;
  }
  
  if (!feed.items) return;
  let feedChanged = false;
  const newItems = [];
  for (const oldItem of feed.items) {
    const item = { ...oldItem };
    if (!item.thumbUrl && !item.thumbFetched) {
      try {
        item.thumbUrl = await discoverThumb(item.link);
      } catch (error) {
        log.error("failed to discover thumb", feed, item, error);
      }
      item.thumbFetched = true;
      feedChanged = true;
    }
    newItems.push(item);
  }
  if (feedChanged) {
    await Store.updateFeed(feed, (update) => ({
      ...update,
      items: newItems,
    }));
  }
}

// ## fetch
export async function discoverThumb(url, timeout = DISCOVER_THUMB_TIMEOUT) {
  if (url in _cache) {
    return _cache[url][0];
  }
  const controller = new AbortController();
  const abortTimeout = setTimeout(() => controller.abort(), parseInt(timeout));
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": USER_AGENT,
    },
    signal: controller.signal,
  });
  clearTimeout(abortTimeout);
  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("text/html")) {
    return find(url, "");
  }
  return find(url, body);
}

// ## accept
// Consider accepting a thumb URL. Match against reject list. Resolve relative
// URLs to absolute with respect to base URL.
function accept(base_url, thumb_url) {
  // Bail, if there's no URL.
  if (!thumb_url) {
    return null;
  }
  // Check rejected URLs
  for (let i = 0, reject_url; (reject_url = REJECTED_URLS[i]); i++) {
    if (thumb_url == reject_url) {
      return null;
    }
  }
  // Check rejected regexes
  for (let i = 0, reject_re; (reject_re = REJECTED_RES[i]); i++) {
    var r = new RegExp(reject_re);
    if (r.test(thumb_url)) {
      return null;
    }
  }
  // Resolve any relative URLs to the fetched base URL.
  thumb_url = new URL(thumb_url, base_url).href;
  return thumb_url;
}

// ## find
export function find(base_url, body) {
  if (base_url in _cache) {
    return _cache[base_url][0];
  }

  const next = function (err, url, kind) {
    _cache[base_url] = [url, kind];
    return url;
  };

  const domparser = new DOMParser();
  const doc = domparser.parseFromString(body, "text/html");

  function selectAttr(sel, attr) {
    const el = doc.querySelector(sel);
    if (!el) return;
    return el.getAttribute(attr);
  }

  let thumb_url;

  // Open Graph image
  thumb_url = accept(
    base_url,
    selectAttr('meta[property="og:image"]', "content")
  );
  if (thumb_url) return next(null, thumb_url, "meta_og_image");

  // Twitter thumbnail
  thumb_url = accept(
    base_url,
    selectAttr('meta[name="twitter:image"]', "value")
  );
  if (thumb_url) return next(null, thumb_url, "link_twitter_image");

  // Old-school Facebook thumbnail convention
  thumb_url = accept(base_url, selectAttr('link[rel="image_src"]', "href"));
  if (thumb_url) return next(null, thumb_url, "meta_image_src");

  // Try looking for the largest image in a number of common containers
  var containers = [
    "article",
    ".content",
    ".entry",
    ".postContainer",
    "#article .first .image", // NYT?
    "#comic",
    ".comic",
    "#main-content",
    null, // Last-ditch, try all images everywhere
  ];

  for (let sel of containers) {
    // Assemble the selector, gather images.
    var imgs = doc.querySelectorAll(sel ? sel + " img" : "img");
    if (!imgs.length) {
      continue;
    }

    // Assemble image areas, where available.
    var areas = [];
    for (let idx = 0; idx < imgs.length; idx++) {
      const img = imgs[idx];
      // TODO: Use something to discover real dimensions?
      var width = img.getAttribute("width") || 0;
      var height = img.getAttribute("height") || 0;
      areas.push([width * height, img]);
    }

    // If we got any areas, sort them and use the largest.
    if (areas.length) {
      areas.sort((a, b) => b[0] - a[0]);
      for (let area of areas) {
        thumb_url = accept(base_url, area[1].getAttribute("src"));
        if (thumb_url) return next(null, thumb_url, "largest");
      }
    }
  }

  return next(null, null, "notfound");
}
