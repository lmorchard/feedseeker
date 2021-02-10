import setupLog from "../lib/log";
import { findFeeds } from "../lib/feeds";

const log = setupLog("contentScript");
const { runtime } = browser;

let port = null;

async function init() {
  port = runtime.connect({ name: "feedDetect" });
  port.onMessage.addListener(handleMessage);
  document.addEventListener("DOMContentLoaded", handleDOMLoaded);  
}

const postMessage = (type, data) => port.postMessage({ type, data });

function handleDOMLoaded() {
  const feeds = findFeeds(window.location.toString(), document.title, document);
  log.debug("Feeds", feeds);
  if (feeds.length > 0) {
    postMessage("foundFeeds", feeds);
  }
}

function handleMessage(message) {
  log("Unimplemented message", JSON.stringify({ message }, null, " "));
}

init()
  .then(() => log.info("READY."))
  .catch(err => log.error(err));
