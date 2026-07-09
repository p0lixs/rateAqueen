import { NextResponse } from "next/server";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";
import { closeExpiredEvent } from "@/lib/events";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: API_ERROR.INVALID_SESSION }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: owned, error: ownedError }, { data: invited, error: invitedError }] = await Promise.all([
    supabase.from("events").select("id,title,owner_name,status,closes_at,admin_token,created_at,owner_results_viewed_at,queens(image_url,sort_order),invitations(has_voted)").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("invitations").select("token,has_voted,results_viewed_at,events(id,title,owner_name,status,closes_at,queens(image_url,sort_order),invitations(has_voted))").eq("user_id", user.id),
  ]);
  if (ownedError || invitedError) return NextResponse.json({ error: API_ERROR.DASHBOARD_LOAD_FAILED }, { status: 500 });
  const ownedStatuses = new Map<string, string>();
  await Promise.all((owned || []).map(async (event) => {
    ownedStatuses.set(event.id, await closeExpiredEvent(supabase, event));
  }));

  const created = (owned || []).map((event) => ({
    title: event.title,
    owner_name: event.owner_name,
    status: ownedStatuses.get(event.id) || event.status,
    image_url: firstImage(event.queens),
    votes_cast: event.invitations.filter((item) => item.has_voted).length,
    votes_total: event.invitations.length,
    href: `/manage/${event.admin_token}`,
    role: "owner",
    result_seen: (ownedStatuses.get(event.id) || event.status) !== "results" || Boolean(event.owner_results_viewed_at),
  }));
  const invitationRooms = await Promise.all((invited || []).map(async (invitation) => {
    const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
    if (!event) return null;
    const status = await closeExpiredEvent(supabase, event);
    return {
      title: event.title,
      owner_name: event.owner_name,
      status,
      image_url: firstImage(event.queens),
      votes_cast: event.invitations.filter((item) => item.has_voted).length,
      votes_total: event.invitations.length,
      href: status === "results" ? `/results/${invitation.token}` : `/vote/${invitation.token}`,
      role: "guest",
      result_seen: status !== "results" || Boolean(invitation.results_viewed_at),
    };
  }));
  return NextResponse.json({ created, invited: invitationRooms.filter(Boolean) }, { headers: { "Cache-Control": "no-store" } });
}

function firstImage(queens: { image_url: string; sort_order: number }[]) {
  return [...queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null;
}
