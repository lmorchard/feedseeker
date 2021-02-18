import { html } from "htm/preact";
import { useState, useCallback, useEffect } from "preact/hooks";
import { hslToRgb } from "../../lib/hslToRgb";
import { getItemTime } from "../../lib/feeds";
import Store from "../../lib/store";
import FeedItem from "./FeedItem";
import { LazyLoadManager } from "./LazyLoad";

export const App = ({ stats = {}, items = [], theme = "light", postMessage }) => {
  const [applyDarkTheme, setApplyDarkTheme] = useState(theme === "dark");

  const toggleTheme = useCallback(() => {
    setApplyDarkTheme((applyDarkTheme) => !applyDarkTheme);
    Store.setAppTheme(applyDarkTheme ? "dark" : "light");
  }, [ setApplyDarkTheme ]);

  useEffect(() => {
    document.body.classList[applyDarkTheme ? "add" : "remove"]("dark-theme");
  }, [applyDarkTheme]);

  const pollAllFeeds = () => postMessage("pollAllFeeds");
  const discoverThumbsForAllFeeds = () =>
    postMessage("discoverThumbsForAllFeeds");

  const itemsSorted = [...items]
    .sort((a, b) => getItemTime(b) - getItemTime(a))
    .slice(0, 200)
    ;

  const formatStatus = ({ isRunning, pending, size } = {}) =>
    isRunning
      ? `${("" + pending).padStart(3, "0")} / ${("" + size).padStart(3, "0")}`
      : "000 / 000";

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
          <span class="theme-indicator" onClick=${toggleTheme}>X</span>
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
