import getConfig from "./config";

const config = getConfig();

export const logLevels = {
  quiet: [0, null],
  error: [10, "error"],
  warn: [20, "warn"],
  info: [30, "info"],
  verbose: [40, "info"],
  debug: [50, "debug"],
  trace: [60, "debug"],
};

const noop = () => {};

export default function (name, maxLevelName = config.LOG_LEVEL) {
  const maxLevel = logLevels[maxLevelName][0];
  const logPrefix = `[feedseeker ${name}]`;
  const log = (...args) => console.log(logPrefix, ...args);
  Object.entries(logLevels).forEach(([levelName, [level, consoleMethod]]) => {
    log[levelName] =
      consoleMethod && level <= maxLevel
        ? (...args) =>
            console[consoleMethod](logPrefix, `(${levelName})`, ...args)
        : noop;
  });
  return log;
}
