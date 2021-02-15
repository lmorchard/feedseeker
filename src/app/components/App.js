import { html } from "htm/preact";
import FeedItem from "./FeedItem";
import { LazyLoadManager } from "./LazyLoad";

export const App = ({ stats = {}, items = [], postMessage }) => {
  const pollAllFeeds = () => postMessage("pollAllFeeds");
  const discoverThumbsForAllFeeds = () =>
    postMessage("discoverThumbsForAllFeeds");

  const itemsSorted = [...items].sort((a, b) =>
    b.isoDate.localeCompare(a.isoDate)
  );

  const formatStatus = (statItem) =>
    statItem.isRunning ? `${statItem.pending} / ${statItem.size}` : "idle";

  const feedsStatus = formatStatus(stats.feedPollQueue);
  const thumbsStatus = formatStatus(stats.discoverThumbQueue);

  return html`
    <${LazyLoadManager}>
      <header>
        <h1>FeedSeeker</h1>
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
