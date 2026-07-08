import { NextResponse } from "next/server";
import { API_ERROR, type ApiErrorCode } from "@/lib/api-errors";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/supabase";
import { displayNameFromUser } from "@/lib/user";

export const runtime = "nodejs";

type QueenInput = { name: string };
type PersonInput = { name: string };

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: API_ERROR.AUTH_REQUIRED_CREATE }, { status: 401 });
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const queens = JSON.parse(String(form.get("queens") || "[]")) as QueenInput[];
    const people = JSON.parse(String(form.get("people") || "[]")) as PersonInput[];
    const visibility = String(form.get("visibility") || "private") === "public" ? "public" : "private";
    const status = String(form.get("startMode") || "voting") === "registration" ? "registration" : "voting";

    if (!title || queens.length < 2 || (visibility === "private" && people.length < 1)) {
      return NextResponse.json({ error: API_ERROR.INCOMPLETE_DATA }, { status: 400 });
    }
    if (queens.length > 30 || people.length > 100) {
      return NextResponse.json({ error: API_ERROR.ROOM_LIMITS_EXCEEDED }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const adminToken = createToken();
    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({ title, admin_token: adminToken, owner_id: user.id, owner_name: displayNameFromUser(user), visibility, status, public_token: visibility === "public" ? createToken() : null })
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
        throw new ApiRouteError(API_ERROR.INVALID_QUEEN_PHOTO);
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
    const invitationRows = people.map((person) => ({
        event_id: createdEvent.id,
        name: person.name.trim(),
        nickname: person.name.trim(),
        token: createToken(),
      }));
    if (invitationRows.length) {
      const { error: peopleError } = await supabase.from("invitations").insert(invitationRows);
      if (peopleError) throw peopleError;
    }

    return NextResponse.json({ adminToken });
  } catch (cause) {
    console.error(cause);
    const error = cause instanceof ApiRouteError ? cause.code : API_ERROR.ROOM_CREATE_FAILED;
    return NextResponse.json({ error }, { status: 500 });
  }
}

class ApiRouteError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
  }
}
