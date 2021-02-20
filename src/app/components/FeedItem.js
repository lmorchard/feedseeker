import { html } from "htm/preact";
import { LazyLoadImage } from "./LazyLoad";
import { useState, useCallback, useContext } from "preact/hooks";
import { format as timeagoFormat } from "timeago.js";
import AppContext from "./AppContext";
import { getItemTime } from "../../lib/feeds";

export const FeedItem = ({ item, feed }) => {
  const {
    addIgnoredFeedID,
    updateFeedsData,
  } = useContext(AppContext);

  const { id: feedID, title: feedTitle, link: feedLink } = feed;

  const {
    id,
    link,
    title,
    author,
    contentSnippet: text,
    thumbUrl,
    // isNew,
    // isDefunct,
  } = item;

  const itemTime = getItemTime(item);

  let feedHostname;
  try {
    const feedUrl = new URL(feedLink);
    feedHostname = feedUrl.hostname;
  } catch (e) {
    /* no-op */
  }

  const [showOptions, setShowOptions] = useState(false);
  const toggleOptions = useCallback(
    () => setShowOptions((current) => !current),
    [setShowOptions]
  );

  const handleAddIgnoredFeedID = useCallback(async () => {
    setShowOptions(false);
    await addIgnoredFeedID(feedID);
    updateFeedsData();
  }, [feedID]);

  return html`
    <li
      id="item-${id}"
      class="feeditem${!thumbUrl ? "" : " has-thumb"}"
    >
      <summary>
        ${!thumbUrl
          ? ""
          : html`
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
          </span>
        `}
      </div>

      ${author && html` <span class="author">${author}</span> `}

      <div class="date">
        <a class="datelink" target="_blank" href=${link}>
          ${timeagoFormat(itemTime)}
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
          <button onClick=${handleAddIgnoredFeedID}>Ignore this feed</button>
        </div>
      `}
    </li>
  `;
};

export default FeedItem;
