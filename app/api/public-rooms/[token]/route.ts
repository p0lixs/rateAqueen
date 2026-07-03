import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,title,status,queens(image_url,sort_order),invitations(has_voted)").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: "Esta sala pública no existe" }, { status: 404 });
  const { data: membership } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();
  return NextResponse.json({
    title: event.title,
    status: event.status,
    image_url: [...event.queens].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null,
    members: event.invitations.length,
    votes_cast: event.invitations.filter((item) => item.has_voted).length,
    membership,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  const { token } = await params;
  const { name, nickname } = await request.json() as { name?: string; nickname?: string };
  const cleanName = name?.trim();
  const cleanNickname = nickname?.trim();
  if (!cleanName || !cleanNickname || cleanName.length > 60 || cleanNickname.length > 60) return NextResponse.json({ error: "Introduce un nombre y un apodo válidos" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id,status").eq("public_token", token).eq("visibility", "public").maybeSingle();
  if (!event) return NextResponse.json({ error: "Esta sala pública no existe" }, { status: 404 });
  const { data: existing } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();
  if (existing) return NextResponse.json(existing);
  if (event.status !== "voting") return NextResponse.json({ error: "La sala ya está cerrada" }, { status: 409 });
  const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if ((count || 0) >= 100) return NextResponse.json({ error: "La sala ha alcanzado el máximo de 100 miembros" }, { status: 409 });

  const invitationToken = createToken();
  const { data, error } = await supabase.from("invitations").insert({ event_id: event.id, user_id: user.id, name: cleanName, nickname: cleanNickname, token: invitationToken }).select("token,has_voted").single();
  if (error) {
    const { data: raced } = await supabase.from("invitations").select("token,has_voted").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();
    if (raced) return NextResponse.json(raced);
    return NextResponse.json({ error: "No se pudo completar la unión" }, { status: 500 });
  }
  return NextResponse.json(data);
}
