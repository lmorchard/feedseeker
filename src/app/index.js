import { html, render } from "htm/preact";

import setupLog from "../lib/log";
import Store from "../lib/store";
import config from "../lib/config";
import { getItemTime } from "../lib/feeds";
import { throttle } from "../lib/utils";
import App from "./components/App";

const log = setupLog("app");
const { DISPLAY_MAX_AGE, APP_UPDATE_INTERVAL } = config();

let port;
let appProps = {};

async function init() {
  log.trace("init");
  appProps.theme = await Store.getAppTheme();

  port = setupPort();
  log.trace("port connected", port);

  browser.storage.onChanged.addListener(
    throttle(updateAll, APP_UPDATE_INTERVAL)
  );
  await updateAll();
}

async function updateAll() {
  const feedIDs = await Store.getFeedIDs();
  const ignoredFeedIDs = await Store.getIgnoredFeedIDs();

  const minDisplayTime = Date.now() - DISPLAY_MAX_AGE;

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
        if (getItemTime(item) < minDisplayTime) continue;
        items.push({ ...item, feed });
      }
    }
  }

  updateApp({ feedIDs, items });
}

const renderApp = () => {
  render(
    html`<${App} postMessage=${postMessage} ...${appProps} />`,
    document.getElementById("app"),
    document.getElementById("app").firstChild
  );
};

const updateApp = (props = {}) => {
  appProps = { ...appProps, ...props };
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
    default:
      log.warn("Unimplemented message", message);
  }
}

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
