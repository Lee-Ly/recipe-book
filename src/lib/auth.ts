import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAccess } from "./access";

export const SESSION_COOKIE = "rb_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/** "owner" can do everything. "guest" (a friend who knows the friends' password) can only view. */
export type Role = "owner" | "guest";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set in .env.local");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/** `epoch` is the friends'-password version: changing that password invalidates every older guest session. */
export function makeSessionToken(role: Role, epoch = 0): string {
  const body = `${role}.${epoch}.${Date.now() + SESSION_MS}`;
  return `${body}.${sign(body)}`;
}

function readSessionToken(token: string): { role: Role; epoch: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [role, epoch, expires, signature] = parts;
  if (role !== "owner" && role !== "guest") return null;
  const expected = Buffer.from(sign(`${role}.${epoch}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!(Number(expires) > Date.now())) return null;
  return { role, epoch: Number(epoch) };
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Which password was typed: the owner's, the friends', or neither. */
export async function checkPassword(input: string): Promise<Role | null> {
  const owner = process.env.APP_PASSWORD;
  if (!owner) throw new Error("APP_PASSWORD is not set in .env.local");
  if (timingSafeEqual(digest(input), digest(owner))) return "owner";
  const access = await getAccess();
  if (access.enabled && timingSafeEqual(digest(input), digest(access.password))) return "guest";
  return null;
}

export async function getRole(): Promise<Role | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) return null;
  if (session.role === "owner") return "owner";
  const access = await getAccess();
  return access.enabled && access.epoch === session.epoch ? "guest" : null;
}

/** True only for the owner. Everything that changes something checks this. */
export async function isAuthed(): Promise<boolean> {
  return (await getRole()) === "owner";
}

/** True for the owner and for friends: anyone allowed to look at the recipes. */
export async function isViewer(): Promise<boolean> {
  return (await getRole()) !== null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Not logged in" }, { status: 401 });
}
