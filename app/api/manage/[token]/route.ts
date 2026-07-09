import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";
import { API_ERROR } from "@/lib/api-errors";
import { closeExpiredEvent } from "@/lib/events";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,description,owner_name,status,visibility,public_token,closes_at,owner_id,queens(name,sort_order),invitations(name,nickname,token,has_voted,user_id)")
    .eq("admin_token", token)
    .single();
  if (error || !data) return NextResponse.json({ error: API_ERROR.INVALID_ADMIN_LINK }, { status: 404 });
  const status = await closeExpiredEvent(supabase, data);
  const user = await getUserFromRequest(request);
  if (user && !data.owner_id) await supabase.from("events").update({ owner_id: user.id }).eq("id", data.id).is("owner_id", null);
  const { id: _id, owner_id: _ownerId, ...response } = data;
  return NextResponse.json({ ...response, status }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase.from("events").select("id,status,closes_at").eq("admin_token", token).single();
  if (error || !event) return NextResponse.json({ error: API_ERROR.INVALID_ADMIN_LINK }, { status: 404 });
  const status = await closeExpiredEvent(supabase, event);
  if (status === "results") return NextResponse.json({ status: "results" });

  const { action } = await request.json().catch(() => ({ action: "close" })) as { action?: string };
  if (action === "open") {
    if (status === "voting") return NextResponse.json({ status: "voting" });
    const { error: openError } = await supabase.from("events").update({ status: "voting" }).eq("id", event.id).eq("status", "registration");
    if (openError) return NextResponse.json({ error: API_ERROR.VOTING_OPEN_FAILED }, { status: 500 });
    return NextResponse.json({ status: "voting" });
  }
  if (status === "registration") return NextResponse.json({ error: API_ERROR.VOTING_NOT_OPEN }, { status: 409 });

  const { count } = await supabase.from("ballots").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if (!count) return NextResponse.json({ error: API_ERROR.VOTE_REQUIRED_TO_CLOSE }, { status: 400 });

  const { error: updateError } = await supabase.from("events").update({ status: "results" }).eq("id", event.id).eq("status", "voting");
  if (updateError) return NextResponse.json({ error: API_ERROR.VOTING_CLOSE_FAILED }, { status: 500 });
  return NextResponse.json({ status: "results" });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: deleted, error } = await supabase
    .from("events")
    .delete()
    .eq("admin_token", token)
    .in("status", ["registration", "voting"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: API_ERROR.ROOM_DELETE_FAILED }, { status: 500 });
  if (!deleted) {
    const { data: event } = await supabase.from("events").select("status").eq("admin_token", token).maybeSingle();
    if (event?.status === "results") return NextResponse.json({ error: API_ERROR.PUBLISHED_ROOM_DELETE_FORBIDDEN }, { status: 409 });
    return NextResponse.json({ error: API_ERROR.ROOM_NOT_FOUND }, { status: 404 });
  }

  const { data: files } = await supabase.storage.from("queen-images").list(deleted.id, { limit: 100 });
  if (files?.length) {
    const paths = files.map((file) => `${deleted.id}/${file.name}`);
    const { error: storageError } = await supabase.storage.from("queen-images").remove(paths);
    if (storageError) console.error("No se pudieron limpiar algunas imágenes de la sala", storageError);
  }
  return NextResponse.json({ deleted: true });
}
