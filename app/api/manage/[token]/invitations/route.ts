import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { API_ERROR } from "@/lib/api-errors";
import { closeExpiredEvent } from "@/lib/events";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { name } = await request.json() as { name?: string };
  const cleanName = name?.trim();
  if (!cleanName || cleanName.length > 60) {
    return NextResponse.json({ error: API_ERROR.INVALID_NAME }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase.from("events").select("id,status,visibility,closes_at").eq("admin_token", token).single();
  if (error || !event) return NextResponse.json({ error: API_ERROR.INVALID_ADMIN_LINK }, { status: 404 });
  const status = await closeExpiredEvent(supabase, event);
  if (!["registration", "voting"].includes(status)) return NextResponse.json({ error: API_ERROR.VOTING_CLOSED }, { status: 409 });
  if (event.visibility === "public") return NextResponse.json({ error: API_ERROR.PUBLIC_MEMBERS_USE_GLOBAL_LINK }, { status: 409 });

  const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if ((count || 0) >= 100) return NextResponse.json({ error: API_ERROR.PARTICIPANT_LIMIT_REACHED }, { status: 400 });

  const { data, error: insertError } = await supabase.from("invitations").insert({ event_id: event.id, name: cleanName, nickname: cleanName, token: createToken() }).select("name,nickname,token,has_voted").single();
  if (insertError) return NextResponse.json({ error: API_ERROR.PARTICIPANT_ADD_FAILED }, { status: 500 });
  return NextResponse.json(data);
}
