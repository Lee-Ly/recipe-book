import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";
import { cache } from "react";
import { readAccessSetting, writeAccessSetting } from "./store";

/**
 * The password the owner gives to friends. Friends who enter it can only VIEW the site.
 * It is stored encrypted (so the owner can look it up and copy it later), and every change bumps `epoch`,
 * which signs all friends out and makes them enter the new password.
 */
interface Stored {
  enabled: boolean;
  passwordEnc: string;
  epoch: number;
}

export interface Access {
  enabled: boolean;
  password: string;
  epoch: number;
}

const MIN_LENGTH = 6;

function key(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return createHash("sha256").update(`${s}|access`).digest();
}

function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

function decrypt(value: string): string | null {
  try {
    const [iv, tag, data] = value.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null; // for example the secret was changed: the owner sets a new password
  }
}

/**
 * Reads the current friends' access. Within ONE page render the answer is reused (so the layout and the page
 * ask the database once), but nothing is remembered between requests: a changed password applies immediately.
 */
export const getAccess = cache(async (): Promise<Access> => {
  const stored = await readAccessSetting<Stored>();
  const password = stored ? (decrypt(stored.passwordEnc) ?? "") : "";
  return { enabled: !!stored?.enabled && !!password, password, epoch: stored?.epoch ?? 0 };
});

async function save(stored: Stored): Promise<Access> {
  await writeAccessSetting(stored);
  const password = decrypt(stored.passwordEnc) ?? "";
  return { enabled: stored.enabled && !!password, password, epoch: stored.epoch };
}

/** Sets (or changes) the friends' password and signs every friend out. */
export async function setGuestPassword(password: string): Promise<Access> {
  const pw = password.trim();
  if (pw.length < MIN_LENGTH) throw new Error(`The password needs at least ${MIN_LENGTH} characters.`);
  if (pw === process.env.APP_PASSWORD) throw new Error("Use a different password from your own.");
  const current = await getAccess();
  return save({ enabled: true, passwordEnc: encrypt(pw), epoch: current.epoch + 1 });
}

/** Turns friends' access off: nobody can get in with the friends' password until a new one is set. */
export async function disableGuestAccess(): Promise<Access> {
  const current = await getAccess();
  return save({ enabled: false, passwordEnc: encrypt(current.password || randomBytes(6).toString("hex")), epoch: current.epoch + 1 });
}

/** An easy-to-read random password such as "kxm7-p2wq". */
export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${part()}-${part()}`;
}
