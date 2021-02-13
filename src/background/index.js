import setupLog from "../lib/log";
import Store from "../lib/store";
import { createQueue, queues } from "../lib/queues";
import { fetchFeed } from "../lib/feeds";

const log = setupLog("background");

const ports = {
  appPage: {},
  feedDetect: {},
};

async function init() {
  browser.runtime.onConnect.addListener(handleConnect);
  browser.browserAction.onClicked.addListener(openApp);

  createQueue("feedPollQueue", {
    concurrency: 4,
    onTask: async feed => {
      const fetchedFeed = await fetchFeed(feed);
      await Store.updateFeed(feed, (update) => ({
        ...update,
        ...fetchedFeed,
        fetchedCount: (update.fetchedCount || 0) + 1,
      }));
    },
    onResolve: (result, task, taskId) => {
      console.debug("resolve", taskId, task, result);
    },
    onReject: (result, task, taskId) => {
      console.debug("reject", taskId, task, result);
    },
  });

  setTimeout(async () => {
    pollAllFeeds();
  }, 2000);
}

async function pollAllFeeds() {
  log.debug("pollAllFeeds")
  const feedIDs = await Store.getFeedIDs();
  for (const feedID of feedIDs) {
    const feed = await Store.getFeed(feedID);
    queues.feedPollQueue.push(feed);
  }
}

async function openApp() {
  pollAllFeeds();

  const pageURL = browser.runtime.getURL("/app/index.html");

  // TODO: shouldn't getViews work for this?
  // const windows = browser.extension.getViews({ type: "tab" });
  const windows = await browser.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  });

  for (var win of windows) {
    for (var tab of win.tabs) {
      if (pageURL === tab.url) {
        log.debug("activating existing tab");
        browser.windows.update(win.id, { focused: true });
        browser.tabs.update(tab.id, { active: true });
        return;
      }
    }
  }

  log.debug("creating new tab");
  browser.tabs.create({
    active: true,
    url: "/app/index.html",
  });
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

function handleMessage({ port, message }) {
  const id = port.sender.tab.id;
  const { type, data } = message;
  const handler =
    type in messageTypes ? messageTypes[type] : messageTypes.default;
  handler({ port, id, message, type, data }).catch((err) =>
    log.error("message error", "" + err)
  );
}

const messageTypes = {
  foundFeeds: async ({ id, data: feeds }) => {
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
    }
  },
};

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
