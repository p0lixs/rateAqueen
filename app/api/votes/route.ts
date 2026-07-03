import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const { token, ranking } = await request.json() as { token?: string; ranking?: string[] };
    if (!token || !Array.isArray(ranking)) return NextResponse.json({ error: "Voto no válido" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("submit_anonymous_ballot", { p_token: token, p_ranking: ranking, p_user_id: user?.id || null });
    if (error) {
      const known = error.message.includes("public room requires member account") ? "Debes iniciar sesión con la cuenta miembro de esta sala pública" : error.message.includes("voting closed") ? "La administradora ya ha cerrado esta votación" : error.message.includes("account already participated") ? "Tu cuenta ya ha participado en esta sala" : error.message.includes("invitation belongs to another account") ? "Esta invitación está vinculada a otra cuenta" : error.message.includes("already voted") ? "Esta invitación ya se ha utilizado" : error.message.includes("invalid ranking") ? "La clasificación no es válida" : "No se pudo guardar el voto";
      return NextResponse.json({ error: known }, { status: 400 });
    }
    return NextResponse.json({ status: data });
  } catch {
    return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  }
}
