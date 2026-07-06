import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id,event_id,name,nickname,has_voted,user_id,events(title,status,visibility,queens(id,name,image_url,sort_order))")
    .eq("token", token)
    .single();
  if (error || !invitation) return NextResponse.json({ error: "Esta invitación no es válida" }, { status: 404 });

  const user = await getUserFromRequest(request);
  const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
  if (!event) return NextResponse.json({ error: "La partida no existe" }, { status: 404 });
  if (event.visibility === "private" && user && !invitation.user_id) {
    const { data: existing } = await supabase.from("invitations").select("id,has_voted").eq("event_id", invitation.event_id).eq("user_id", user.id).maybeSingle();
    if (existing && existing.id !== invitation.id) {
      return NextResponse.json({ error: existing.has_voted ? "Ya has votado en esta sala con tu cuenta" : "Tu cuenta ya tiene otra invitación para esta sala" }, { status: 409 });
    }
    const { error: claimError } = await supabase.from("invitations").update({ user_id: user.id }).eq("id", invitation.id).is("user_id", null);
    if (claimError) return NextResponse.json({ error: "Tu cuenta ya está vinculada a otra invitación de esta sala" }, { status: 409 });
  } else if (event.visibility === "private" && user && invitation.user_id && invitation.user_id !== user.id) {
    return NextResponse.json({ error: "Esta invitación está vinculada a otra cuenta" }, { status: 403 });
  }

  const { data: invitations } = await supabase.from("invitations").select("has_voted").eq("event_id", invitation.event_id);
  const queens = [...event.queens].sort((a, b) => a.sort_order - b.sort_order).map((queen) => ({ id: queen.id, name: queen.name, image_url: queen.image_url }));

  return NextResponse.json({
    title: event.title,
    status: event.status,
    queens,
    voter: { name: invitation.name, nickname: invitation.nickname, has_voted: invitation.has_voted },
    votes_cast: invitations?.filter((item) => item.has_voted).length || 0,
    votes_total: invitations?.length || 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
