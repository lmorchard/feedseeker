import { html } from "htm/preact";
import { useState, useCallback } from "preact/hooks";
import { LazyLoadImage } from "./LazyLoad";
import { format as timeagoFormat } from "timeago.js";
import FeedItem from "./FeedItem";
import { getItemTime } from "../../lib/feeds";
import {
  ONE_HOUR,
  THREE_HOURS,
  SIX_HOURS,
  HALF_DAY,
  ONE_DAY,
  THREE_DAYS,
  ONE_WEEK,
} from "../../lib/times";

export const Feed = ({ feed, ...props }) => {
  const { title, link, lastNewAt } = feed;

  const [itemsDuration, setItemsDuration] = useState(durations[0]);

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

  const items = itemsSince(feed, itemsDuration);
  items.sort((a, b) => getItemTime(b) - getItemTime(a));

  const [nextItemsCount, nextItemsDuration] = findNextDurationPage(
    feed,
    itemsDuration
  );
  const moreItemsCount = nextItemsCount - items.length;

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
          ${items.map(
            (item) => html`
              <${FeedItem} key=${item.id} ...${{ item, feed }} />
            `
          )}
        </ul>
        ${moreItemsCount > 0 &&
        html`
          <button class="more-items" onClick=${() => setItemsDuration(nextItemsDuration)}>
            ${moreItemsCount} more since ${timeagoFormat(Date.now() - nextItemsDuration)}...
          </button>
        `}
      </details>
    </li>
  `;
};

const durations = [
  ONE_HOUR,
  THREE_HOURS,
  SIX_HOURS,
  HALF_DAY,
  ONE_DAY,
  THREE_DAYS,
  ONE_WEEK,
];

function itemsSince(feed, duration) {
  const since = Date.now() - duration;
  return feed.items.filter((item) => getItemTime(item) > since);
}

function findNextDurationPage(feed, currentDuration) {
  const itemsCount = itemsSince(feed, currentDuration).length;
  for (const duration of durations) {
    if (duration < currentDuration) continue;
    const nextItemsCount = itemsSince(feed, duration).length;
    if (nextItemsCount > itemsCount) return [nextItemsCount, duration];
  }
  return [0, null];
}

export default Feed;
