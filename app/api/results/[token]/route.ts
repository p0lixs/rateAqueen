import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Queen } from "@/lib/types";
import { calculateResults } from "@/lib/ranking";
import { API_ERROR } from "@/lib/api-errors";
import { closeExpiredEvent } from "@/lib/events";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  let eventId: string | undefined;
  let title: string | undefined;
  let ownerName: string | null | undefined;
  let status: string | undefined;
  let invitationId: string | undefined;
  let accessedAsAdmin = false;

  const { data: adminEvent } = await supabase.from("events").select("id,title,owner_name,status,closes_at").eq("admin_token", token).maybeSingle();
  if (adminEvent) { ({ id: eventId, title, owner_name: ownerName } = adminEvent); status = await closeExpiredEvent(supabase, adminEvent); accessedAsAdmin = true; }
  else {
    const { data: invitation } = await supabase.from("invitations").select("id,event_id,user_id,events(id,title,owner_name,status,visibility,closes_at)").eq("token", token).maybeSingle();
    const event = invitation && (Array.isArray(invitation.events) ? invitation.events[0] : invitation.events);
    if (invitation && event) {
      eventId = invitation.event_id; invitationId = invitation.id; title = event.title; ownerName = event.owner_name; status = await closeExpiredEvent(supabase, event);
    }
  }
  if (!eventId) return NextResponse.json({ error: API_ERROR.INVALID_LINK }, { status: 404 });
  if (status !== "results") return NextResponse.json({ error: API_ERROR.RESULTS_NOT_PUBLISHED }, { status: 403 });

  if (accessedAsAdmin) await supabase.from("events").update({ owner_results_viewed_at: new Date().toISOString() }).eq("id", eventId);
  else if (invitationId) await supabase.from("invitations").update({ results_viewed_at: new Date().toISOString() }).eq("id", invitationId);

  const [{ data: queens }, { data: ballots }] = await Promise.all([
    supabase.from("queens").select("id,name,image_url").eq("event_id", eventId),
    supabase.from("ballots").select("ranking").eq("event_id", eventId),
  ]);
  const voteCount = ballots?.length || 0;
  const results = calculateResults((queens as Queen[]) || [], (ballots || []).map((ballot) => ballot.ranking as string[]));
  return NextResponse.json({ title, owner_name: ownerName, votes: voteCount, results }, { headers: { "Cache-Control": "no-store" } });
}
