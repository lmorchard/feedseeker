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

  return html`
    <${LazyLoadManager}>
      <pre>${JSON.stringify(stats)}</pre>
      <button onClick=${pollAllFeeds}>Poll all feeds</button>
      <button onClick=${discoverThumbsForAllFeeds}>Discover thumbs</button>
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
