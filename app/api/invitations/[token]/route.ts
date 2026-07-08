import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/supabase";
import { API_ERROR } from "@/lib/api-errors";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id,event_id,name,nickname,has_voted,user_id,events(title,description,owner_name,status,visibility,queens(id,name,image_url,sort_order))")
    .eq("token", token)
    .single();
  if (error || !invitation) return NextResponse.json({ error: API_ERROR.INVALID_INVITATION }, { status: 404 });

  const user = await getUserFromRequest(request);
  const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
  if (!event) return NextResponse.json({ error: API_ERROR.ROOM_NOT_FOUND }, { status: 404 });
  if (event.visibility === "private" && user && !invitation.user_id) {
    const { data: existing } = await supabase.from("invitations").select("id,has_voted").eq("event_id", invitation.event_id).eq("user_id", user.id).maybeSingle();
    if (existing && existing.id !== invitation.id) {
      return NextResponse.json({ error: existing.has_voted ? API_ERROR.ACCOUNT_ALREADY_VOTED : API_ERROR.ACCOUNT_HAS_INVITATION }, { status: 409 });
    }
    const { error: claimError } = await supabase.from("invitations").update({ user_id: user.id }).eq("id", invitation.id).is("user_id", null);
    if (claimError) return NextResponse.json({ error: API_ERROR.ACCOUNT_INVITATION_CONFLICT }, { status: 409 });
  } else if (event.visibility === "private" && user && invitation.user_id && invitation.user_id !== user.id) {
    return NextResponse.json({ error: API_ERROR.INVITATION_OTHER_ACCOUNT }, { status: 403 });
  }

  const { data: invitations } = await supabase.from("invitations").select("has_voted").eq("event_id", invitation.event_id);
  const queens = [...event.queens].sort((a, b) => a.sort_order - b.sort_order).map((queen) => ({ id: queen.id, name: queen.name, image_url: queen.image_url }));

  return NextResponse.json({
    title: event.title,
    description: event.description,
    owner_name: event.owner_name,
    status: event.status,
    queens,
    voter: { name: invitation.name, nickname: invitation.nickname, has_voted: invitation.has_voted },
    votes_cast: invitations?.filter((item) => item.has_voted).length || 0,
    votes_total: invitations?.length || 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
