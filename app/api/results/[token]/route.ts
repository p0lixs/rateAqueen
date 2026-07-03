import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";
import type { Queen, Result } from "@/lib/types";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  let eventId: string | undefined;
  let title: string | undefined;
  let status: string | undefined;

  const { data: adminEvent } = await supabase.from("events").select("id,title,status").eq("admin_token", token).maybeSingle();
  if (adminEvent) ({ id: eventId, title, status } = adminEvent);
  else {
    const { data: invitation } = await supabase.from("invitations").select("event_id,user_id,events(title,status,visibility)").eq("token", token).maybeSingle();
    const event = invitation && (Array.isArray(invitation.events) ? invitation.events[0] : invitation.events);
    if (invitation && event) {
      if (event.visibility === "public") {
        const user = await getUserFromRequest(request);
        if (!user || invitation.user_id !== user.id) return NextResponse.json({ error: "Debes iniciar sesión con la cuenta miembro de esta sala" }, { status: 401 });
      }
      eventId = invitation.event_id; title = event.title; status = event.status;
    }
  }
  if (!eventId) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  if (status !== "results") return NextResponse.json({ error: "La clasificación se publicará cuando vote todo el grupo" }, { status: 403 });

  const [{ data: queens }, { data: ballots }] = await Promise.all([
    supabase.from("queens").select("id,name,image_url").eq("event_id", eventId),
    supabase.from("ballots").select("ranking").eq("event_id", eventId),
  ]);
  const score = new Map<string, { total: number; firsts: number }>();
  (queens || []).forEach((queen) => score.set(queen.id, { total: 0, firsts: 0 }));
  (ballots || []).forEach((ballot) => (ballot.ranking as string[]).forEach((id, index, ranking) => {
    const item = score.get(id);
    if (item) { item.total += ranking.length - index; if (index === 0) item.firsts++; }
  }));
  const voteCount = ballots?.length || 0;
  const results: Result[] = (queens as Queen[] || []).map((queen) => ({ ...queen, average: score.get(queen.id)!.total / voteCount, first_places: score.get(queen.id)!.firsts }))
    .sort((a, b) => b.average - a.average || b.first_places - a.first_places || a.name.localeCompare(b.name, "es"));
  return NextResponse.json({ title, votes: voteCount, results }, { headers: { "Cache-Control": "no-store" } });
}
