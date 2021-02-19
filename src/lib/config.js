export default function () {
  const config = {
    ENV: "development",
    APP_NAME: "feedseeker",
    APP_UPDATE_INTERVAL: 1000,
    UPDATE_STATS_INTERVAL: 200,
    QUEUE_CONCURRENCY: 2,
    FEED_POLL_CONCURRENCY: 3,
    FEED_POLL_INTERVAL: 1000 * 60 * 60,
    FEED_POLL_TIMEOUT: 5000,
    DISCOVER_THUMB_CONCURRENCY: 3,
    DISCOVER_THUMB_INTERVAL: 1000 * 60 * 60,
    DISCOVER_THUMB_TIMEOUT: 1000,
    DISPLAY_MAX_AGE: 1000 * 60 * 60 * 24 * 1,
    DISPLAY_LIMIT: 1000,
    USER_AGENT: "feedseeker/1.0 (+https://github.com/lmorchard/feedseeker)",
  };
  config.DEBUG = config.ENV === "development";
  config.LOG_LEVEL = config.DEBUG ? "debug" : "info";
  return config;
}
