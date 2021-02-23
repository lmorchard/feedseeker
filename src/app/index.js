import { html, render } from "htm/preact";

import setupLog from "../lib/log";
import Store from "../lib/store";
import setupConfig from "../lib/config";
import App from "./components/App";
import { getItemTime } from "../lib/feeds";

const config = setupConfig();
const { DEBUG, DISPLAY_MAX_AGE } = config;
const log = setupLog("app");

let port;
let appProps = {};

async function init() {
  log.trace("init");

  port = setupPort();
  log.trace("port connected", port);

  appProps = {
    config,
    postMessage,
    updateApp,
    busy: false,
    initialTheme: await Store.getAppTheme(),
    updateFeedsData: updateFeedsData,
    setAppTheme: (theme) => Store.setAppTheme(theme),
    addIgnoredFeedID: async (feedID) => {
      await Store.addIgnoredFeedID(feedID);
      updateFeedsData();
    },
    pollAllFeeds: () => postMessage("pollAllFeeds"),
    discoverThumbsForAllFeeds: () => postMessage("discoverThumbsForAllFeeds"),
  };

  await updateFeedsData();
}

const renderApp = () => {
  render(
    html`<${App} postMessage=${postMessage} ...${appProps} />`,
    document.getElementById("app"),
    document.getElementById("app").firstChild
  );
};

const updateFeedsData = async (extraProps = {}) => {
  updateApp({ busy: true });

  const feedCutoffTime = Date.now() - DISPLAY_MAX_AGE;

  const feedsMeta = Object.values(await Store.getAllFeedsMeta())
    .filter(
      (feed) =>
        !feed.ignored &&
        feed.lastNewAt &&
        new Date(feed.lastNewAt).getTime() > feedCutoffTime
    );

  const feeds = {};
  for (const feedMeta of feedsMeta) {
    const feed = await Store.getFeed(feedMeta.id);
    if (feed.ignored) continue; // FIXME: seems missing from feedsMeta?
    feed.items = feed.items.filter(
      (item) => getItemTime(item) > feedCutoffTime
    );
    if (!feed.items.length) continue;
    feeds[feed.id] = feed;
  }

  updateApp({ ...extraProps, feeds, busy: false });

  if (DEBUG) {
    window.appProps = appProps;
  }
};

const updateApp = (props = {}) => {
  //appProps = { ...appProps, ...props };
  Object.assign(appProps, props);
  renderApp();
};

function setupPort() {
  const port = browser.runtime.connect({ name: "appPage" });
  port.onMessage.addListener((message) => handleMessage({ message }));
  return port;
}

const postMessage = (type, data) => port.postMessage({ type, data });

async function handleMessage({ message }) {
  const { type, data } = message;
  switch (type) {
    case "updateStats":
      return updateApp({ stats: data });
    case "feedPollStart":
      return updateApp({ feedPollActive: true });
    case "feedPollDone":
      return updateFeedsData({ feedPollActive: false });
    default:
      log.trace("Unimplemented message", message);
  }
}

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
