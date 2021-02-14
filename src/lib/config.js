export default function () {
  return {
    LOG_LEVEL: "debug",
    UPDATE_STATS_INTERVAL: 500,
    QUEUE_CONCURRENCY: 8,
    FEED_POLL_CONCURRENCY: 8,
    FEED_POLL_INTERVAL: 1000 * 60 * 60,
  };
}
