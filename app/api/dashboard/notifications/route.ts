import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ created: 0, joined: 0 });
  const supabase = getSupabaseAdmin();
  const [{ count: created }, { count: joined }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "results").is("owner_results_viewed_at", null),
    supabase.from("invitations").select("id,events!inner(status)", { count: "exact", head: true }).eq("user_id", user.id).is("results_viewed_at", null).eq("events.status", "results"),
  ]);
  return NextResponse.json({ created: created || 0, joined: joined || 0 }, { headers: { "Cache-Control": "no-store" } });
}
