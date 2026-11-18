import { disableGuestAccess, generatePassword, setGuestPassword } from "@/lib/access";
import { isAuthed, unauthorized } from "@/lib/auth";

/** The owner changes the friends' password: set one, generate one, or turn friends' access off. */
export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const body = (await req.json().catch(() => null)) as { op?: unknown; password?: unknown } | null;
  try {
    let access;
    if (body?.op === "set") access = await setGuestPassword(typeof body.password === "string" ? body.password : "");
    else if (body?.op === "generate") access = await setGuestPassword(generatePassword());
    else if (body?.op === "disable") access = await disableGuestAccess();
    else return Response.json({ error: "Unknown change." }, { status: 400 });
    return Response.json({ enabled: access.enabled, password: access.password });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Couldn't save." }, { status: 400 });
  }
}
