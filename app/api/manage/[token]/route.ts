import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,status,visibility,public_token,owner_id,invitations(name,nickname,token,has_voted)")
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

export async function DELETE(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: deleted, error } = await supabase
    .from("events")
    .delete()
    .eq("admin_token", token)
    .eq("status", "voting")
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "No se pudo eliminar la sala" }, { status: 500 });
  if (!deleted) {
    const { data: event } = await supabase.from("events").select("status").eq("admin_token", token).maybeSingle();
    if (event?.status === "results") return NextResponse.json({ error: "Una sala cerrada y publicada no se puede eliminar" }, { status: 409 });
    return NextResponse.json({ error: "La sala no existe" }, { status: 404 });
  }

  const { data: files } = await supabase.storage.from("queen-images").list(deleted.id, { limit: 100 });
  if (files?.length) {
    const paths = files.map((file) => `${deleted.id}/${file.name}`);
    const { error: storageError } = await supabase.storage.from("queen-images").remove(paths);
    if (storageError) console.error("No se pudieron limpiar algunas imágenes de la sala", storageError);
  }
  return NextResponse.json({ deleted: true });
}
