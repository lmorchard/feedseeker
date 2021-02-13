const PREFIX = "feedseeker.";
const FEEDS_PREFIX = `feeds.`;

const toStoreId = (id) => `${PREFIX}${id}`;
//const fromStoreId = (id) => id.slice(PREFIX.length);

const get = async (id) => {
  const v = await browser.storage.sync.get(toStoreId(id));
  return v[toStoreId(id)];
};

const set = async (id, value) =>
  browser.storage.sync.set({ [toStoreId(id)]: value });

export const Store = {
  async init() {},

  async getFeedIDs() {
    const ids = await get("feedIDs");
    console.log("GOT IDS", ids);
    if (ids) return ids;
    await set("feedIDs", []);
    return [];
  },

  async indexFeedID(id) {
    const ids = await Store.getFeedIDs();
    console.log("WHAT WHAT", ids);
    if (!ids.includes(id)) {
      ids.push(id);
      await set("feedIDs", ids);
    }
  },

  async getFeed(id) {
    return await get(`${FEEDS_PREFIX}${id}`);
  },

  async updateFeed(feed) {
    const id = feed.href;
    await set(`${FEEDS_PREFIX}${id}`, feed);
    await this.indexFeedID(id);
  },
};

export default Store;
