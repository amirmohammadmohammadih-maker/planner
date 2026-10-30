/* Password hashing that works both on the server (Node) and inside the browser/WebView
   (mobile app with the embedded database). Uses WebCrypto PBKDF2-SHA256.
   Format:  pbkdf2$<iterations>$<saltHex>$<hashHex>
   Legacy:  scrypt$<saltHex>$<hashHex>   (created by earlier server versions — verified on the server only) */

const ITERATIONS = 120_000;

const subtle = () => globalThis.crypto.subtle;
const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const fromHex = (hex: string) => new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts[0] === "pbkdf2" && parts.length === 4) {
    const iterations = Number(parts[1]);
    if (!Number.isFinite(iterations) || iterations < 1000) return false;
    const candidate = await pbkdf2(password, fromHex(parts[2]), iterations);
    return equal(candidate, fromHex(parts[3]));
  }
  if (parts[0] === "scrypt" && parts.length === 3 && typeof window === "undefined") {
    // Legacy hashes from earlier server versions (Node only).
    const { scryptSync } = await import("node:crypto");
    const candidate = new Uint8Array(scryptSync(password, parts[1], 64));
    return equal(candidate, fromHex(parts[2]));
  }
  return false;
}
