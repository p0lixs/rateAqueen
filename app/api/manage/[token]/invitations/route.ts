import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { name, nickname } = await request.json() as { name?: string; nickname?: string };
  const cleanName = name?.trim();
  const cleanNickname = nickname?.trim();
  if (!cleanName || !cleanNickname || cleanName.length > 60 || cleanNickname.length > 60) {
    return NextResponse.json({ error: "Introduce un nombre y un apodo válidos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase.from("events").select("id,status,visibility").eq("admin_token", token).single();
  if (error || !event) return NextResponse.json({ error: "Enlace de administración no válido" }, { status: 404 });
  if (event.status !== "voting") return NextResponse.json({ error: "La votación ya está cerrada" }, { status: 409 });
  if (event.visibility === "public") return NextResponse.json({ error: "En una sala pública los miembros deben unirse mediante el enlace global" }, { status: 409 });

  const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  if ((count || 0) >= 100) return NextResponse.json({ error: "La sala ya tiene el máximo de 100 participantes" }, { status: 400 });

  const { data, error: insertError } = await supabase.from("invitations").insert({ event_id: event.id, name: cleanName, nickname: cleanNickname, token: createToken() }).select("name,nickname,token,has_voted").single();
  if (insertError) return NextResponse.json({ error: "No se pudo añadir la participante" }, { status: 500 });
  return NextResponse.json(data);
}
