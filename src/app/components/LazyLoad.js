import { html } from "htm/preact";
import { createContext } from "preact";
import {
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "preact/hooks";

const LAZY_LOAD_THRESHOLD = 0.1;

export const LazyLoadContext = createContext({});

export const LazyLoadManager = ({ children }) => {
  const observer = useRef();

  const [toLoad, setToLoad] = useState({});

  const createObserver = useCallback(() => {
    observer.current = new IntersectionObserver(handleIntersections, {
      threshold: LAZY_LOAD_THRESHOLD,
    });
  });

  const updateObserver = useCallback(() => {
    observer.current.disconnect();
    const toObserve = document.querySelectorAll(".lazy-load");
    for (const element of toObserve) {
      observer.current.observe(element);
    }
  });

  const handleIntersections = useCallback((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const dataSrc = entry.target.getAttribute("data-src");
        if (dataSrc) {
          setToLoad((currentLoaded) => ({ ...currentLoaded, [dataSrc]: true }));
        }
      }
    }
  });

  useEffect(createObserver, []);
  useEffect(updateObserver);

  return html` <${LazyLoadContext.Provider} value=${toLoad}> ${children} <//> `;
};

export const LazyLoadImage = ({ src, class: className = "", ...imgProps }) => {
  const loaded = useContext(LazyLoadContext);
  let currentSrc, dataSrc;
  if (loaded[src]) {
    dataSrc = "";
    currentSrc = src;
  } else {
    dataSrc = src;
    currentSrc = "";
  }
  return html`
    <img
      src=${currentSrc}
      data-src=${dataSrc}
      class="lazy-load ${className}"
      ...${imgProps}
    />
  `;
};
