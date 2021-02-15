import { html } from "htm/preact";
import { LazyLoadImage } from "./LazyLoad";
import TimeAgo from "timeago-react";
import { useState, useCallback } from "preact/hooks";

import Store from "../../lib/store";

export const FeedItem = ({ item, feed }) => {
  const { id: feedID, title: feedTitle, link: feedLink } = feed;

  const {
    link,
    title,
    author,
    isoDate: date,
    contentSnippet: text,
    thumbUrl,
    isNew,
    isDefunct,
  } = item;

  let feedHostname;
  try {
    const feedUrl = new URL(feedLink);
    feedHostname = feedUrl.hostname;
  } catch (e) {
    console.log("Bad feed link for", feed.title);
  }

  const [showOptions, setShowOptions] = useState(false);
  const toggleOptions = useCallback(
    () => setShowOptions((current) => !current),
    [setShowOptions]
  );

  const addIgnoredFeedID = useCallback(async () => {
    setShowOptions(false);
    await Store.addIgnoredFeedID(feedID);
  }, [feedID]);

  return html`
    <li class="feeditem${!thumbUrl ? "" : " has-thumb"}">
      <summary>
        ${!!thumbUrl &&
        html`
          <a target="_blank" class="thumb" href=${link}>
            <${LazyLoadImage} src="${thumbUrl}" />
          </a>
        `}
        ${title &&
        html`<a class="title" target="_blank" href=${link}>${title}</a>`}
        <button class="options" onClick=${toggleOptions}>...</button>
      </summary>

      <div class="details">
        ${text &&
        html`
          <span class="text">
            ${text.length < 160 ? text : text.substr(0, 160) + "[...]"}
            ${isNew ? "(NEW)" : ""} ${isDefunct ? "(DEFUNCT)" : ""}
          </span>
        `}
      </div>

      ${author && html` <span class="author">${author}</span> `}

      <div class="date">
        <a class="datelink" datetime="${date}" target="_blank" href=${link}>
          <${TimeAgo} datetime=${date} />
        </a>
      </div>

      <div class="source">
        <${LazyLoadImage}
          class="icon"
          width="16"
          height="16"
          src="https://www.google.com/s2/favicons?domain=${feedHostname}"
        />
        <a class="link" href="${feedLink}">${feedTitle}</a>
      </div>

      ${showOptions &&
      html`
        <div class="optionsPanel">
          <button class="optionsClose" onClick=${toggleOptions}>(X)</button>
          <button onClick=${addIgnoredFeedID}>Ignore this feed</button>
        </div>
      `}
    </li>
  `;
};

export default FeedItem;
