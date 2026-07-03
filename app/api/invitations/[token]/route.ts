import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("event_id,name,nickname,has_voted,events(title,status,queens(id,name,image_url,sort_order))")
    .eq("token", token)
    .single();
  if (error || !invitation) return NextResponse.json({ error: "Esta invitación no es válida" }, { status: 404 });

  const { data: invitations } = await supabase.from("invitations").select("has_voted").eq("event_id", invitation.event_id);
  const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
  if (!event) return NextResponse.json({ error: "La partida no existe" }, { status: 404 });
  const queens = [...event.queens].sort((a, b) => a.sort_order - b.sort_order).map(({ sort_order: _, ...queen }) => queen);

  return NextResponse.json({
    title: event.title,
    status: event.status,
    queens,
    voter: { name: invitation.name, nickname: invitation.nickname, has_voted: invitation.has_voted },
    votes_cast: invitations?.filter((item) => item.has_voted).length || 0,
    votes_total: invitations?.length || 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
