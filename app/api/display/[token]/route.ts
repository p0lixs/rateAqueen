import { NextResponse } from "next/server";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { closeExpiredEvent } from "@/lib/events";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase
    .from("events")
    .select("id,title,description,owner_name,status,closes_at,invitations(has_voted)")
    .eq("public_token", token)
    .eq("visibility", "public")
    .maybeSingle();

  if (!event) return NextResponse.json({ error: API_ERROR.PUBLIC_ROOM_NOT_FOUND }, { status: 404 });
  const status = await closeExpiredEvent(supabase, event);
  return NextResponse.json({
    title: event.title,
    description: event.description,
    owner_name: event.owner_name,
    status,
    closes_at: event.closes_at,
    members: event.invitations.length,
    votes: event.invitations.filter((item) => item.has_voted).length,
  }, { headers: { "Cache-Control": "no-store" } });
}
