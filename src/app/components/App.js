import { html } from "htm/preact";
import { useState, useCallback, useEffect } from "preact/hooks";
import { hslToRgb } from "../../lib/hslToRgb";
import Feed from "./Feed";
import { LazyLoadManager } from "./LazyLoad";
import AppContext from "./AppContext";

export const App = (props = {}) => {
  const {
    stats = {},
    feeds = {},
    initialTheme = "light",
    busy = false,
    setAppTheme,
    pollAllFeeds,
    discoverThumbsForAllFeeds,
    updateFeedsData,
  } = props;

  const feedsSorted = Object.values(feeds).sort((a, b) =>
    b.lastNewAt.localeCompare(a.lastNewAt)
  );

  const [applyDarkTheme, setApplyDarkTheme] = useState(initialTheme === "dark");

  const toggleTheme = useCallback(
    () => setApplyDarkTheme((applyDarkTheme) => !applyDarkTheme),
    [setApplyDarkTheme]
  );

  useEffect(async () => {
    document.body.classList[applyDarkTheme ? "add" : "remove"]("dark-theme");
    await setAppTheme(applyDarkTheme ? "dark" : "light");
  }, [applyDarkTheme]);

  const formatStatus = ({ isRunning, pending, size } = {}) =>
    isRunning
      ? `${("" + pending).padStart(3, "0")} / ${("" + size).padStart(3, "0")}`
      : "000 / 000";

  const timeStats = stats.time || Date.now();
  const queueStats = stats.queue || {};
  const feedsStatus = formatStatus(queueStats.feedPollQueue);
  const thumbsStatus = formatStatus(queueStats.discoverThumbQueue);

  /*
  const HB_COLOR_CYCLE_INTERVAL = 5000;
  const [hbR, hbG, hbB] = hslToRgb(
    (timeStats % HB_COLOR_CYCLE_INTERVAL) / HB_COLOR_CYCLE_INTERVAL,
    0.6,
    applyDarkTheme ? 0.7 : 0.3
  );
  //  style=${{ color: `rgb(${hbR}, ${hbG}, ${hbB})` }}
  */

  return html`
    <${AppContext.Provider} value=${props}>
      <${LazyLoadManager}>
        <header>
          <h1>FeedSeeker</h1>
          <nav>
            <span class="busy-indicator${busy ? " busy" : ""}"></span>
            <button onClick=${updateFeedsData}>⭯</button>
            <button onClick=${pollAllFeeds}>Feeds (${feedsStatus})</button>
            <button onClick=${discoverThumbsForAllFeeds}>
              Thumbs (${thumbsStatus})
            </button>
            <span class="theme-indicator" onClick=${toggleTheme}>X</span>
          </nav>
        </header>

        <ul class="feeds">
          ${feedsSorted.map(
            (feed) => html`<${Feed} key=${feed.id} ...${{ feed }} />`
          )}
        </ul>
      <//>
    <//>
  `;
};

export default App;
