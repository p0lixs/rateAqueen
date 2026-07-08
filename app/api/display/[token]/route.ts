import { NextResponse } from "next/server";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: event } = await getSupabaseAdmin()
    .from("events")
    .select("title,owner_name,status,invitations(has_voted)")
    .eq("public_token", token)
    .eq("visibility", "public")
    .maybeSingle();

  if (!event) return NextResponse.json({ error: API_ERROR.PUBLIC_ROOM_NOT_FOUND }, { status: 404 });
  return NextResponse.json({
    title: event.title,
    owner_name: event.owner_name,
    status: event.status,
    members: event.invitations.length,
    votes: event.invitations.filter((item) => item.has_voted).length,
  }, { headers: { "Cache-Control": "no-store" } });
}
