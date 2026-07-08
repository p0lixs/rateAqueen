import { NextResponse } from "next/server";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: API_ERROR.INVALID_SESSION }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: owned, error: ownedError }, { data: invited, error: invitedError }] = await Promise.all([
    supabase.from("events").select("title,owner_name,status,admin_token,created_at,owner_results_viewed_at,queens(image_url,sort_order),invitations(has_voted)").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("invitations").select("token,has_voted,results_viewed_at,events(title,owner_name,status,queens(image_url,sort_order),invitations(has_voted))").eq("user_id", user.id),
  ]);
  if (ownedError || invitedError) return NextResponse.json({ error: API_ERROR.DASHBOARD_LOAD_FAILED }, { status: 500 });

  const created = (owned || []).map((event) => ({
    title: event.title,
    owner_name: event.owner_name,
    status: event.status,
    image_url: firstImage(event.queens),
    votes_cast: event.invitations.filter((item) => item.has_voted).length,
    votes_total: event.invitations.length,
    href: `/manage/${event.admin_token}`,
    role: "owner",
    result_seen: event.status !== "results" || Boolean(event.owner_results_viewed_at),
  }));
  const invitationRooms = (invited || []).flatMap((invitation) => {
    const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
    if (!event) return [];
    return [{
      title: event.title,
      owner_name: event.owner_name,
      status: event.status,
      image_url: firstImage(event.queens),
      votes_cast: event.invitations.filter((item) => item.has_voted).length,
      votes_total: event.invitations.length,
      href: event.status === "results" ? `/results/${invitation.token}` : `/vote/${invitation.token}`,
      role: "guest",
      result_seen: event.status !== "results" || Boolean(invitation.results_viewed_at),
    }];
  });
  return NextResponse.json({ created, invited: invitationRooms }, { headers: { "Cache-Control": "no-store" } });
}

function firstImage(queens: { image_url: string; sort_order: number }[]) {
  return [...queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null;
}
