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
