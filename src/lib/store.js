import { hashStringAsID } from "./utils";

const PREFIX = "feedseeker.";
const FEEDS_PREFIX = `feeds.`;

const toStoreId = (id) => `${PREFIX}${id}`;
//const fromStoreId = (id) => id.slice(PREFIX.length);

const storage = browser.storage.local;

const get = async (id, defval) => {
  const v = await storage.get(toStoreId(id));
  return v[toStoreId(id)] || defval;
};

const set = async (id, value) => storage.set({ [toStoreId(id)]: value });

const remove = async (...ids) => storage.remove(ids.map(toStoreId));

export const Store = {
  async init() {},

  async feedToID(feed) {
    return hashStringAsID(feed.href);
  },

  async getFeedIDs() {
    return get("feedIDs", []);
  },

  async indexFeedID(id) {
    const ids = await this.getFeedIDs();
    if (!ids.includes(id)) {
      ids.push(id);
      await set("feedIDs", ids);
    }
  },

  async getFeed(id, defval) {
    return get(`${FEEDS_PREFIX}${id}`, defval);
  },

  async setFeed(id, feed) {
    return set(`${FEEDS_PREFIX}${id}`, feed);
  },

  async removeFeeds(...ids) {
    return remove(ids.map((id) => `${FEEDS_PREFIX}${id}`));
  },

  async updateFeed(feed, updater) {
    const id = await this.feedToID(feed);
    const existing = await this.getFeed(id, {});
    const merged = { ...existing, ...feed, id };
    const updated = updater ? await updater(merged) : merged;
    await this.setFeed(id, updated);
    await this.indexFeedID(id);
  },

  async getIgnoredFeedIDs() {
    return get("ignoredFeedIDs", []);
  },

  async addIgnoredFeedID(feedID) {
    const ignoredFeedIDs = await this.getIgnoredFeedIDs();
    const feed = await this.getFeed(feedID);
    if (feed) {
      this.updateFeed(feed, (update) => ({
        ...update,
        items: [],
        ignored: true,
      }));
    }
    return set("ignoredFeedIDs", [...ignoredFeedIDs, feedID]);
  },

  async removeIgnoredFeedID(feedID) {
    const ignoredFeedIDs = await this.getIgnoredFeedIDs();
    const feed = await this.getFeed(feedID);
    if (feed) {
      this.updateFeed(feed, (update) => ({ ...update, ignored: false }));
    }
    return set(
      "ignoredFeedIDs",
      ignoredFeedIDs.filter((id) => id !== feedID)
    );
  },

  async getAppTheme() {
    return get("appTheme", "light");
  },

  async setAppTheme(theme) {
    return set("appTheme", theme);
  },
};

export default Store;
