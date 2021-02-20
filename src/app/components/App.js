import { html } from "htm/preact";
import { useState, useCallback, useEffect } from "preact/hooks";
import { hslToRgb } from "../../lib/hslToRgb";
import { getItemTime } from "../../lib/feeds";
import FeedItem from "./FeedItem";
import { LazyLoadManager } from "./LazyLoad";
import AppContext from "./AppContext";

export const App = (props = {}) => {
  const {
    config: { DISPLAY_LIMIT },
    stats = {},
    items = [],
    initialTheme = "light",
    displayLimit = DISPLAY_LIMIT,
    busy = false,
    setAppTheme,
    pollAllFeeds,
    discoverThumbsForAllFeeds,
  } = props;

  const [applyDarkTheme, setApplyDarkTheme] = useState(initialTheme === "dark");

  const toggleTheme = useCallback(
    () => setApplyDarkTheme((applyDarkTheme) => !applyDarkTheme),
    [setApplyDarkTheme]
  );

  useEffect(async () => {
    document.body.classList[applyDarkTheme ? "add" : "remove"]("dark-theme");
    await setAppTheme(applyDarkTheme ? "dark" : "light");
  }, [applyDarkTheme]);

  const itemsSorted = [...items]
    .sort((a, b) => getItemTime(b) - getItemTime(a))
    .slice(0, displayLimit);

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
    applyDarkTheme ? 0.7 : 0.3
  );

  return html`
    <${AppContext.Provider} value=${props}>
      <${LazyLoadManager}>
        <header>
          <h1 style=${{ color: `rgb(${hbR}, ${hbG}, ${hbB})` }}>FeedSeeker</h1>
          <nav>
            <span class="busy-indicator${busy ? " busy" : ""}"></span>
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
              <${FeedItem}
                key="${idx}-${item.id}"
                ...${{ item, feed: item.feed }}
              />
            `
          )}
        </ul>
      <//>
    <//>
  `;
};

export default App;
