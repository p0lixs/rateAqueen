import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createDeviceKey, DEVICE_COOKIE, deviceHash, deviceKeyFromRequest } from "@/lib/device";
import { API_ERROR } from "@/lib/api-errors";

export async function GET(request: Request) {
  const deviceKey = deviceKeyFromRequest(request) || createDeviceKey();
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  let roomsQuery = supabase.from("events")
    .select("id,title,owner_name,status,public_token,created_at,closes_at,queens(image_url,sort_order),invitations(has_voted)")
    .eq("visibility", "public")
    .in("status", ["registration", "voting"])
    .or(`closes_at.is.null,closes_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (query) roomsQuery = roomsQuery.ilike("title", `%${query}%`);
  const { data: rooms, error } = await roomsQuery;
  if (error) return NextResponse.json({ error: API_ERROR.ROOM_SEARCH_FAILED }, { status: 500 });

  const ids = (rooms || []).map((room) => room.id);
  const { data: memberships } = ids.length
    ? await supabase.from("invitations").select("event_id,token").eq("device_hash", deviceHash(deviceKey)).in("event_id", ids)
    : { data: [] as { event_id: string; token: string }[] };
  const membershipByRoom = new Map((memberships || []).map((item) => [item.event_id, item.token]));

  const response = NextResponse.json((rooms || []).map((room) => {
    const memberToken = membershipByRoom.get(room.id);
    const firstImage = [...room.queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null;
    return {
      title: room.title,
      owner_name: room.owner_name,
      status: room.status,
      image_url: firstImage,
      votes_cast: room.invitations.filter((item) => item.has_voted).length,
      members: room.invitations.length,
      joined: Boolean(memberToken),
      href: memberToken ? (room.status === "results" ? `/results/${memberToken}` : `/vote/${memberToken}`) : `/join/${room.public_token}`,
    };
  }), { headers: { "Cache-Control": "no-store", "X-RAQ-Device": deviceKey } });
  response.cookies.set(DEVICE_COOKIE, deviceKey, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
