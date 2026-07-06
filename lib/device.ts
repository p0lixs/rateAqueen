import { createHash, createHmac, timingSafeEqual } from "crypto";
import { createToken } from "@/lib/security";

export const DEVICE_COOKIE = "raq_device";

function secret() {
  const value = process.env.DEVICE_COOKIE_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error("Falta DEVICE_COOKIE_SECRET o SUPABASE_SECRET_KEY");
  return value;
}

function sign(id: string) {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

export function createDeviceKey() {
  const id = createToken(24);
  return `${id}.${sign(id)}`;
}

export function validDeviceKey(value?: string | null) {
  if (!value) return null;
  const [id, signature, extra] = value.split(".");
  if (!id || !signature || extra) return null;
  const expected = Buffer.from(sign(id));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? value : null;
}

export function deviceKeyFromRequest(request: Request) {
  const header = validDeviceKey(request.headers.get("x-raq-device"));
  if (header) return header;
  const cookie = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${DEVICE_COOKIE}=`));
  return validDeviceKey(cookie ? decodeURIComponent(cookie.slice(DEVICE_COOKIE.length + 1)) : null);
}

export function deviceHash(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
