import { cookies } from "next/headers";
import { getAccess } from "@/lib/access";
import { checkPassword, makeSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { clearFailures, clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (tooManyFailures(ip)) {
    return Response.json({ error: "Too many wrong attempts. Please try again in a few minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  const role = await checkPassword(password);
  if (!role) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  clearFailures(ip);
  const epoch = role === "guest" ? (await getAccess()).epoch : 0;
  (await cookies()).set(SESSION_COOKIE, makeSessionToken(role, epoch), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return Response.json({ ok: true, role });
}
