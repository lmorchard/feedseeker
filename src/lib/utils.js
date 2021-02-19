import setupLog from "../lib/log";

const log = setupLog("lib/utils");

export const wait = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay));

const HASH_ALGO = "SHA-256";

export async function hashStringAsID(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGO, msgUint8);
  return btoa(
    new Uint8Array(hashBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );
}

export const throttle = (fn, delay = 500) => {
  let promise;
  return async (...args) => {
    if (!promise) {
      log.trace("throttle(start)");
      promise = new Promise((resolve, reject) =>
        setTimeout(async () => {
          try {
            const result = await fn(...args);
            promise = null;
            log.trace("throttle(resolve)");
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay)
      );
    } else {
      log.trace("throttle(pending)");
    }
    return promise;
  };
};
