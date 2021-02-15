import config from "./lib/config";
import setupLog from "./lib/log";
import Store from "./lib/store";
import { setupFeeds, pollAllFeeds, pollOneFeed } from "./lib/feeds";
import { setupQueues, queueStats } from "./lib/queues";
import { setupThumbs, discoverThumbsForAllFeeds } from "./lib/thumbs";

const {
  DEBUG,
  UPDATE_STATS_INTERVAL,
  FEED_POLL_INTERVAL,
  DISCOVER_THUMB_INTERVAL,
} = config();
const log = setupLog("background");

const ports = {
  appPage: {},
  feedDetect: {},
};

async function init() {
  await setupQueues();
  await setupFeeds();
  await setupThumbs();

  browser.runtime.onConnect.addListener(handleConnect);
  browser.browserAction.onClicked.addListener(handleBrowserAction);

  setInterval(updateStats, UPDATE_STATS_INTERVAL);
  setInterval(pollAllFeeds, FEED_POLL_INTERVAL);
  setInterval(discoverThumbsForAllFeeds, DISCOVER_THUMB_INTERVAL);

  if (DEBUG) {
    openApp();
  }
}

const postMessage = (port, type, data) => port.postMessage({ type, data });

const broadcastMessage = (name, type, data) =>
  Object.values(ports[name]).forEach((port) => postMessage(port, type, data));

function updateStats() {
  broadcastMessage("appPage", "updateStats", {
    time: Date.now(),
    queue: queueStats(),
  });
}

async function handleBrowserAction() {
  openApp();
}

async function openApp() {
  const pageURL = browser.runtime.getURL("/app/index.html");

  const windows = await browser.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  });

  for (const win of windows) {
    for (const tab of win.tabs) {
      if (pageURL === tab.url) {
        log.verbose("activating existing tab");
        browser.windows.update(win.id, { focused: true });
        browser.tabs.update(tab.id, { active: true, pinned: true });
        return;
      }
    }
  }

  log.verbose("creating new tab");
  browser.tabs.create({ active: true, pinned: true, url: pageURL });
}

function handleConnect(port) {
  const id = port.sender.tab.id;

  log.trace("port connected", port.name, id);
  ports[port.name][id] = port;

  port.onMessage.addListener((message) => handleMessage({ port, message }));

  port.onDisconnect.addListener(() => {
    delete ports[port.name][id];
    log.trace("port disconnected", port.name);
  });
}

async function handleMessage({ port, message }) {
  const id = port.sender.tab.id;
  const { type, data } = message;
  log.trace("handleMessage", type, data);

  switch (type) {
    case "pollAllFeeds": {
      return pollAllFeeds();
    }

    case "discoverThumbsForAllFeeds": {
      return discoverThumbsForAllFeeds();
    }

    case "foundFeeds": {
      const feeds = data;
      browser.pageAction.show(id);
      browser.browserAction.setBadgeBackgroundColor({
        color: "#88ff88",
        tabId: id,
      });
      browser.browserAction.setBadgeText({
        text: "" + feeds.length,
        tabId: id,
      });
      for (let feed of feeds) {
        log.info("Found feed", feed);
        await Store.updateFeed(feed, (update) => ({
          ...update,
          seenCount: (update.seenCount || 0) + 1,
        }));
        await pollOneFeed(feed);
      }
      return;
    }

    default: {
      log.debug("unknown message", message);
    }
  }
}

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));