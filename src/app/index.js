import setupLog from "../lib/log";

const log = setupLog("app");

async function init() {
  log.debug("init() start");
  const port = setupPort();
  log.debug("port connected", port);
}

function setupPort(store) {
  const port = browser.runtime.connect({ name: "appPage" });
  port.onMessage.addListener(message =>
    handleMessage({ store, port, message })
  );
  return port;
}

function handleMessage({ store, port, message }) {
  const { type, data } = message;
  const handler =
    type in messageTypes ? messageTypes[type] : messageTypes.default;
  handler({ store, port, message, type, data }).catch(err =>
    log.error("handleMessage error", err)
  );
}

const messageTypes = {
  //updateStats: async ({ store, data: stats }) =>
  //  store.dispatch(actions.updateStats(stats)),
  default: async ({ message }) =>
    log.warn("Unimplemented message", message)
};

init()
  .then(() => log.info("READY."))
  .catch((err) => log.error(err));
