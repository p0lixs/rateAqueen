import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: event } = await getSupabaseAdmin()
    .from("events")
    .select("title,status,invitations(has_voted)")
    .eq("public_token", token)
    .eq("visibility", "public")
    .maybeSingle();

  if (!event) return NextResponse.json({ error: "Esta sala pública no existe" }, { status: 404 });
  return NextResponse.json({
    title: event.title,
    status: event.status,
    members: event.invitations.length,
    votes: event.invitations.filter((item) => item.has_voted).length,
  }, { headers: { "Cache-Control": "no-store" } });
}
