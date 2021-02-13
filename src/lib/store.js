const PREFIX = "feedseeker.";
const FEEDS_PREFIX = `feeds.`;

const toStoreId = (id) => `${PREFIX}${id}`;
//const fromStoreId = (id) => id.slice(PREFIX.length);

const get = async (id, defval) => {
  const v = await browser.storage.sync.get(toStoreId(id));
  return v[toStoreId(id)] || defval;
};

const set = async (id, value) =>
  browser.storage.sync.set({ [toStoreId(id)]: value });

export const Store = {
  async init() {},

  async getFeedIDs() {
    const ids = await get("feedIDs");
    if (ids) return ids;
    await set("feedIDs", []);
    return [];
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

  async updateFeed(feed, updater) {
    const id = feed.href;
    const existing = await this.getFeed(id, {});
    const merged = { ...existing, ...feed };
    const updated = updater ? await updater(merged) : merged;
    await this.setFeed(id, updated);
    await this.indexFeedID(id);
  },
};

export default Store;
