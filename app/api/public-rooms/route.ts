import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión para buscar salas públicas" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  const supabase = getSupabaseAdmin();
  let roomsQuery = supabase.from("events")
    .select("id,title,status,public_token,created_at,queens(image_url,sort_order),invitations(has_voted)")
    .eq("visibility", "public")
    .eq("status", "voting")
    .order("created_at", { ascending: false })
    .limit(30);
  if (query) roomsQuery = roomsQuery.ilike("title", `%${query}%`);
  const { data: rooms, error } = await roomsQuery;
  if (error) return NextResponse.json({ error: "No se pudieron buscar las salas" }, { status: 500 });

  const ids = (rooms || []).map((room) => room.id);
  const { data: memberships } = ids.length
    ? await supabase.from("invitations").select("event_id,token").eq("user_id", user.id).in("event_id", ids)
    : { data: [] as { event_id: string; token: string }[] };
  const membershipByRoom = new Map((memberships || []).map((item) => [item.event_id, item.token]));

  return NextResponse.json((rooms || []).map((room) => {
    const memberToken = membershipByRoom.get(room.id);
    const firstImage = [...room.queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null;
    return {
      title: room.title,
      status: room.status,
      image_url: firstImage,
      votes_cast: room.invitations.filter((item) => item.has_voted).length,
      members: room.invitations.length,
      joined: Boolean(memberToken),
      href: memberToken ? (room.status === "results" ? `/results/${memberToken}` : `/vote/${memberToken}`) : `/join/${room.public_token}`,
    };
  }), { headers: { "Cache-Control": "no-store" } });
}
