import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createDeviceKey, DEVICE_COOKIE, deviceHash, deviceKeyFromRequest } from "@/lib/device";
import { API_ERROR } from "@/lib/api-errors";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const deviceKey = deviceKeyFromRequest(request) || createDeviceKey();
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,title,owner_name,status,queens(image_url,sort_order),invitations(has_voted)").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: API_ERROR.PUBLIC_ROOM_NOT_FOUND }, { status: 404 });
  const { data: membership } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", deviceHash(deviceKey)).maybeSingle();
  return deviceResponse(deviceKey, {
    title: event.title,
    owner_name: event.owner_name,
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
  if (!cleanName || cleanName.length > 60) return NextResponse.json({ error: API_ERROR.INVALID_NAME }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,status").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: API_ERROR.PUBLIC_ROOM_NOT_FOUND }, { status: 404 });
  const { data: existing } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", currentDeviceHash).maybeSingle();
  if (existing) return deviceResponse(deviceKey, existing);
  if (!["registration", "voting"].includes(event.status)) return NextResponse.json({ error: API_ERROR.VOTING_CLOSED }, { status: 409 });
  const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if ((count || 0) >= 100) return NextResponse.json({ error: API_ERROR.PARTICIPANT_LIMIT_REACHED }, { status: 409 });

  const invitationToken = createToken();
  const { data, error } = await supabase.from("invitations").insert({ event_id: event.id, name: cleanName, nickname: cleanName, token: invitationToken, device_hash: currentDeviceHash }).select("token,has_voted").single();
  if (error) {
    const { data: raced } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("device_hash", currentDeviceHash).maybeSingle();
    if (raced) return deviceResponse(deviceKey, raced);
    return NextResponse.json({ error: API_ERROR.ROOM_JOIN_FAILED }, { status: 500 });
  }
  return deviceResponse(deviceKey, data);
}

function deviceResponse(deviceKey: string, data: unknown) {
  const response = NextResponse.json(data, { headers: { "Cache-Control": "no-store", "X-RAQ-Device": deviceKey } });
  response.cookies.set(DEVICE_COOKIE, deviceKey, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
