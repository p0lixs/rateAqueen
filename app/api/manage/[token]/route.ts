import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("title,status,invitations(name,nickname,token,has_voted)")
    .eq("admin_token", token)
    .single();
  if (error || !data) return NextResponse.json({ error: "Enlace de administración no válido" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
