import { html } from "htm/preact";
import { LazyLoadImage } from "./LazyLoad";

export const FeedItem = ({ item, feed }) => {
  const { title: feedTitle, link: feedLink } = feed;

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

  return html`
    <li class="feeditem${!thumbUrl ? "" : " has-thumb"}">
      <summary>
        ${!thumbUrl ? "" :
        html`<a target="_blank" class="thumb" href=${link}
          ><${LazyLoadImage} src="${thumbUrl}"
        /></a>`}
        ${title &&
        html`<a class="title" target="_blank" href=${link}>${title}</a>`}
      </summary>
      <div class="details">
        ${text &&
        html`
          <span class="text">
            ${text.length < 160 ? text : text.substr(0, 160) + "[...]"}
            ${isNew ? "(NEW)" : ""}
            ${isDefunct ? "(DEFUNCT)" : ""}
          </span>
        `}
      </div>
      ${author && html` <span class="author">${author}</span> `}
      <div class="date">
        <a
          class="datelink timeago"
          datetime="${date}"
          target="_blank"
          href=${link}
          >${date}</a
        >
      </div>
      <div class="feedsource">
        <a class="feedsourcelink" href="${feedLink}">${feedTitle}</a>
      </div>
    </li>
  `;
};

export default FeedItem;
