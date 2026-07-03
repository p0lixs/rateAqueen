import { NextResponse } from "next/server";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";

type QueenInput = { name: string };
type PersonInput = { name: string; nickname: string };

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión para crear una sala" }, { status: 401 });
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const queens = JSON.parse(String(form.get("queens") || "[]")) as QueenInput[];
    const people = JSON.parse(String(form.get("people") || "[]")) as PersonInput[];

    if (!title || queens.length < 2 || people.length < 1) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (queens.length > 30 || people.length > 100) {
      return NextResponse.json({ error: "Máximo 30 reinas y 100 participantes" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const adminToken = createToken();
    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({ title, admin_token: adminToken, owner_id: user.id })
      .select("id")
      .single();
    if (eventError) throw eventError;

    const queenRows = [];
    for (let index = 0; index < queens.length; index++) {
      const file = form.get(`photo_${index}`);
      if (!(file instanceof File)) {
        queenRows.push({ event_id: createdEvent.id, name: queens[index].name.trim(), image_url: "", sort_order: index });
        continue;
      }
      if (!file.type.startsWith("image/") || file.size > 5_000_000) {
        throw new Error(`La foto de ${queens[index].name || `reina ${index + 1}`} no es válida`);
      }
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${createdEvent.id}/${createToken(12)}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("queen-images").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicFile } = supabase.storage.from("queen-images").getPublicUrl(path);
      queenRows.push({ event_id: createdEvent.id, name: queens[index].name.trim(), image_url: publicFile.publicUrl, sort_order: index });
    }

    const { error: queensError } = await supabase.from("queens").insert(queenRows);
    if (queensError) throw queensError;
    const { error: peopleError } = await supabase.from("invitations").insert(
      people.map((person) => ({
        event_id: createdEvent.id,
        name: person.name.trim(),
        nickname: person.nickname.trim(),
        token: createToken(),
      }))
    );
    if (peopleError) throw peopleError;

    return NextResponse.json({ adminToken });
  } catch (cause) {
    console.error(cause);
    const message = cause instanceof Error ? cause.message : "No se pudo crear la partida";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
