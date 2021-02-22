import { html } from "htm/preact";
import { useState, useCallback } from "preact/hooks";
import { LazyLoadImage } from "./LazyLoad";
import { format as timeagoFormat } from "timeago.js";
import FeedItem from "./FeedItem";

export const Feed = ({ feed, ...props }) => {
  const { title, link, lastNewAt } = feed;

  const [shouldOpen, setShouldOpen] = useState(true);
  const toggleOpen = useCallback(
    (ev) => {
      ev.preventDefault();
      setShouldOpen((state) => !state);
    },
    [setShouldOpen]
  );

  let feedHostname;
  try {
    const feedUrl = new URL(link);
    feedHostname = feedUrl.hostname;
  } catch (e) {
    /* no-op */
  }

  return html`
    <li class="feed" ...${props}>
      <details open=${shouldOpen}>
        <summary onClick=${toggleOpen}>
          <span class="title">
            <${LazyLoadImage}
              class="icon"
              width="16"
              height="16"
              src="https://www.google.com/s2/favicons?domain=${feedHostname}"
            />
            <span class="feedtitle">${title}</span>
            <span class="feeddate timeago" datetime="${lastNewAt}">
              ${timeagoFormat(lastNewAt)}
            </span>
          </span>
        </summary>
        <ul className="feeditems">
          ${feed.items
            .slice(0, 25)
            .map(
              (item) => html`
                <${FeedItem} key=${item.id} ...${{ item, feed }} />
              `
            )}
        </ul>
      </details>
    </li>
  `;
};

export default Feed;
