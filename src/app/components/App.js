import { html } from "htm/preact";
import { hslToRgb } from "../../lib/hslToRgb";
import { getItemTime } from "../../lib/feeds";
import FeedItem from "./FeedItem";
import { LazyLoadManager } from "./LazyLoad";

export const App = ({ stats = {}, items = [], postMessage }) => {
  const pollAllFeeds = () => postMessage("pollAllFeeds");
  const discoverThumbsForAllFeeds = () =>
    postMessage("discoverThumbsForAllFeeds");

  const itemsSorted = [...items].sort((a, b) => getItemTime(b) - getItemTime(a));

  const formatStatus = ({ isRunning, pending, size } = {}) =>
    isRunning ? `${pending} / ${size}` : "idle";

  const timeStats = stats.time || Date.now();
  const queueStats = stats.queue || {};
  const feedsStatus = formatStatus(queueStats.feedPollQueue);
  const thumbsStatus = formatStatus(queueStats.discoverThumbQueue);

  const HB_COLOR_CYCLE_INTERVAL = 5000;
  const [hbR, hbG, hbB] = hslToRgb(
    (timeStats % HB_COLOR_CYCLE_INTERVAL) / HB_COLOR_CYCLE_INTERVAL,
    0.6,
    0.3
  );

  return html`
    <${LazyLoadManager}>
      <header>
        <h1 style=${{ color: `rgb(${hbR}, ${hbG}, ${hbB})` }}>FeedSeeker</h1>
        <nav>
          <button onClick=${pollAllFeeds}>Feeds (${feedsStatus})</button>
          <button onClick=${discoverThumbsForAllFeeds}>
            Thumbs (${thumbsStatus})
          </button>
        </nav>
      </header>

      <ul className="feeditems">
        ${itemsSorted.map(
          (item, idx) => html`
            <${FeedItem} key="${idx}" ...${{ item, feed: item.feed }} />
          `
        )}
      </ul>
    <//>
  `;
};

export default App;
