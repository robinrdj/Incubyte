import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const COST: ScryptOptions = { N: 16384, r: 8, p: 1 };

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Hashes a password as `scrypt$N$r$p$salt$key`, so the cost can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;

  const expected = Buffer.from(key, "base64");
  const actual = await deriveKey(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
