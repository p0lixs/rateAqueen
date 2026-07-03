import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,status,owner_id,invitations(name,nickname,token,has_voted)")
    .eq("admin_token", token)
    .single();
  if (error || !data) return NextResponse.json({ error: "Enlace de administración no válido" }, { status: 404 });
  const user = await getUserFromRequest(request);
  if (user && !data.owner_id) await supabase.from("events").update({ owner_id: user.id }).eq("id", data.id).is("owner_id", null);
  const { id: _id, owner_id: _ownerId, ...response } = data;
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase.from("events").select("id,status").eq("admin_token", token).single();
  if (error || !event) return NextResponse.json({ error: "Enlace de administración no válido" }, { status: 404 });
  if (event.status === "results") return NextResponse.json({ status: "results" });

  const { count } = await supabase.from("ballots").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if (!count) return NextResponse.json({ error: "Necesitas al menos un voto antes de cerrar la sala" }, { status: 400 });

  const { error: updateError } = await supabase.from("events").update({ status: "results" }).eq("id", event.id).eq("status", "voting");
  if (updateError) return NextResponse.json({ error: "No se pudo cerrar la votación" }, { status: 500 });
  return NextResponse.json({ status: "results" });
}
