import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "rb_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set in .env.local");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const expires = String(Date.now() + SESSION_MS);
  return `${expires}.${sign(expires)}`;
}

function verifySessionToken(token: string): boolean {
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(expires) > Date.now();
}

export function passwordMatches(input: string): boolean {
  const real = process.env.APP_PASSWORD;
  if (!real) throw new Error("APP_PASSWORD is not set in .env.local");
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!token && verifySessionToken(token);
}

/** `next` is where to return after logging in (e.g. a link shared from another app). */
export async function requireAuth(next?: string): Promise<void> {
  if (await isAuthed()) return;
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}

export function unauthorized(): Response {
  return Response.json({ error: "Not logged in" }, { status: 401 });
}
