import { html, render } from "htm/preact";

import setupLog from "../lib/log";
import Store from "../lib/store";

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

const renderApp = () =>
  render(
    html`<${App} ...${appProps} />`,
    document.getElementById("app"),
    document.getElementById("app").firstChild
  );

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

const pollAllFeeds = () => postMessage("pollAllFeeds");

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

const App = ({ stats = {}, items = [] }) => {
  items.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  return html`
    <div>
      <h1>FeedSeeker</h1>
      <pre>${JSON.stringify(stats)}</pre>
      <button onClick=${pollAllFeeds}>Poll all feeds</button>
      <h2>Items</h2>
      <ul>
        ${items.map(
          ({ title, link, isoDate, feed }, idx) =>
            html`<li key="${idx}">
              ${isoDate} - ${feed.title} <br />
              <a href="${link}">${title}</a>
            </li>`
        )}
      </ul>
    </div>
  `;
};

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
