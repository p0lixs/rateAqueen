import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createDeviceKey, DEVICE_COOKIE, deviceHash, deviceKeyFromRequest } from "@/lib/device";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const deviceKey = deviceKeyFromRequest(request) || createDeviceKey();
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,title,status,queens(image_url,sort_order),invitations(has_voted)").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: "Esta sala pública no existe" }, { status: 404 });
  const { data: membership } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", deviceHash(deviceKey)).maybeSingle();
  return deviceResponse(deviceKey, {
    title: event.title,
    status: event.status,
    image_url: [...event.queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null,
    members: event.invitations.length,
    votes_cast: event.invitations.filter((item) => item.has_voted).length,
    membership,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const deviceKey = deviceKeyFromRequest(request) || createDeviceKey();
  const currentDeviceHash = deviceHash(deviceKey);
  const { token } = await params;
  const { name } = await request.json() as { name?: string };
  const cleanName = name?.trim();
  if (!cleanName || cleanName.length > 60) return NextResponse.json({ error: "Introduce un nombre válido" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,status").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: "Esta sala pública no existe" }, { status: 404 });
  const { data: existing } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", currentDeviceHash).maybeSingle();
  if (existing) return deviceResponse(deviceKey, existing);
  if (!["registration", "voting"].includes(event.status)) return NextResponse.json({ error: "La sala ya está cerrada" }, { status: 409 });
  const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if ((count || 0) >= 100) return NextResponse.json({ error: "La sala ha alcanzado el máximo de 100 miembros" }, { status: 409 });

  const invitationToken = createToken();
  const { data, error } = await supabase.from("invitations").insert({ event_id: event.id, name: cleanName, nickname: cleanName, token: invitationToken, device_hash: currentDeviceHash }).select("token,has_voted").single();
  if (error) {
    const { data: raced } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", currentDeviceHash).maybeSingle();
    if (raced) return deviceResponse(deviceKey, raced);
    return NextResponse.json({ error: "No se pudo completar la unión" }, { status: 500 });
  }
  return deviceResponse(deviceKey, data);
}

function deviceResponse(deviceKey: string, data: unknown) {
  const response = NextResponse.json(data, { headers: { "Cache-Control": "no-store", "X-RAQ-Device": deviceKey } });
  response.cookies.set(DEVICE_COOKIE, deviceKey, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
