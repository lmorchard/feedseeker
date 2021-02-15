import { html, render } from "htm/preact";

import setupLog from "../lib/log";
import Store from "../lib/store";
import App from "./components/App";

const log = setupLog("app");

let port;
let appProps = {};

async function init() {
  log.trace("init");

  port = setupPort();
  log.debug("port connected", port);

  browser.storage.onChanged.addListener(updateFeedIDs);
  browser.storage.onChanged.addListener(updateFeedItems);

  updateFeedIDs();
  updateFeedItems();
}

const updateFeedItems = async () => {
  const items = [];
  const feedIDs = await Store.getFeedIDs();
  for (const feedID of feedIDs) {
    const feed = await Store.getFeed(feedID);
    if (feed.items) {
      items.push(...feed.items.map((item) => ({ ...item, feed })));
    }
  }
  updateApp({ items });
};

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

const updateFeedIDs = async () => {
  updateApp({ feedIDs: await Store.getFeedIDs() });
};

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
