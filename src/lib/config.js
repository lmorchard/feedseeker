export default function () {
  const config = {
    ENV: "development",
    APP_NAME: "feedseeker",
    UPDATE_STATS_INTERVAL: 1000,
    QUEUE_CONCURRENCY: 4,
    FEED_POLL_CONCURRENCY: 4,
    FEED_POLL_INTERVAL: 1000 * 60 * 60,
    DISCOVER_THUMB_CONCURRENCY: 4,
    DISCOVER_THUMB_INTERVAL: 1000 * 60 * 60,
    DISCOVER_THUMB_TIMEOUT: 1000,
    DISPLAY_MAX_AGE: 1000 * 60 * 60 * 24 * 5,
    USER_AGENT: "feedseeker/1.0 (+https://github.com/lmorchard/feedseeker)",
  };
  config.DEBUG = config.ENV === "development";
  config.LOG_LEVEL = config.DEBUG ? "debug" : "info";
  return config;
}
