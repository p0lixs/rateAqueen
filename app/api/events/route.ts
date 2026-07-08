import { NextResponse } from "next/server";
import { API_ERROR, type ApiErrorCode } from "@/lib/api-errors";
import { createToken } from "@/lib/security";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";
import { usernameFromUser } from "@/lib/user";

export const runtime = "nodejs";

type NamedInput = { name: string };

const MAX_TITLE_LENGTH = 80;
const MAX_NAME_LENGTH = 60;
const MAX_PEOPLE = 100;
const MAX_PHOTO_SIZE = 5_000_000;
const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  let eventId: string | undefined;
  const uploadedPaths: string[] = [];
  let supabase: ReturnType<typeof getSupabaseAdmin> | undefined;

  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: API_ERROR.AUTH_REQUIRED_CREATE }, { status: 401 });
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const queens = parseNamedInputs(form.get("queens"));
    const people = parseNamedInputs(form.get("people"));
    const visibility = String(form.get("visibility") || "private") === "public" ? "public" : "private";
    const status = String(form.get("startMode") || "voting") === "registration" ? "registration" : "voting";

    validateInputs({ title, queens, people, visibility, form });

    supabase = getSupabaseAdmin();
    const adminToken = createToken();
    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({ title, admin_token: adminToken, owner_id: user.id, owner_name: usernameFromUser(user), visibility, status, public_token: visibility === "public" ? createToken() : null })
      .select("id")
      .single();
    if (eventError || !createdEvent) throw eventError || new Error("Event insert returned no data");
    eventId = createdEvent.id;

    const queenRows = [];
    for (let index = 0; index < queens.length; index++) {
      const file = form.get(`photo_${index}`);
      if (!(file instanceof File) || file.size === 0) {
        queenRows.push({ event_id: eventId, name: queens[index].name, image_url: "", sort_order: index });
        continue;
      }
      const path = `${eventId}/${createToken(12)}.${PHOTO_EXTENSIONS[file.type]}`;
      const { error: uploadError } = await supabase.storage.from("queen-images").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { data: publicFile } = supabase.storage.from("queen-images").getPublicUrl(path);
      queenRows.push({ event_id: eventId, name: queens[index].name, image_url: publicFile.publicUrl, sort_order: index });
    }

    const { error: queensError } = await supabase.from("queens").insert(queenRows);
    if (queensError) throw queensError;
    const invitationRows = people.map((person) => ({
        event_id: eventId,
        name: person.name,
        nickname: person.name,
        token: createToken(),
      }));
    if (invitationRows.length) {
      const { error: peopleError } = await supabase.from("invitations").insert(invitationRows);
      if (peopleError) throw peopleError;
    }

    return NextResponse.json({ adminToken });
  } catch (cause) {
    if (supabase && eventId) await rollbackCreation(supabase, eventId, uploadedPaths);
    if (!(cause instanceof ApiRouteError)) console.error(cause);
    const error = cause instanceof ApiRouteError ? cause.code : API_ERROR.ROOM_CREATE_FAILED;
    return NextResponse.json({ error }, { status: cause instanceof ApiRouteError ? 400 : 500 });
  }
}

function parseNamedInputs(value: FormDataEntryValue | null): NamedInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value || "[]"));
  } catch {
    throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);
  }
  if (!Array.isArray(parsed)) throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);
  return parsed.map((item) => {
    if (!item || typeof item !== "object" || typeof (item as { name?: unknown }).name !== "string") {
      throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);
    }
    return { name: (item as { name: string }).name.trim() };
  });
}

function validateInputs({ title, queens, people, visibility, form }: {
  title: string;
  queens: NamedInput[];
  people: NamedInput[];
  visibility: "private" | "public";
  form: FormData;
}) {
  if (!title || title.length > MAX_TITLE_LENGTH || queens.length < 2 || (visibility === "private" && people.length < 1)) {
    throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);
  }
  if (people.length > MAX_PEOPLE) throw new ApiRouteError(API_ERROR.ROOM_LIMITS_EXCEEDED);
  if (visibility === "public" && people.length > 0) throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);
  if (!validNames(queens) || !validNames(people)) throw new ApiRouteError(API_ERROR.INCOMPLETE_DATA);

  for (let index = 0; index < queens.length; index++) {
    const file = form.get(`photo_${index}`);
    if (file instanceof File && file.size > 0 && (!PHOTO_EXTENSIONS[file.type] || file.size > MAX_PHOTO_SIZE)) {
      throw new ApiRouteError(API_ERROR.INVALID_QUEEN_PHOTO);
    }
  }
}

function validNames(inputs: NamedInput[]) {
  const normalized = inputs.map(({ name }) => name.toLocaleLowerCase());
  return inputs.every(({ name }) => name.length > 0 && name.length <= MAX_NAME_LENGTH)
    && new Set(normalized).size === normalized.length;
}

async function rollbackCreation(supabase: ReturnType<typeof getSupabaseAdmin>, eventId: string, uploadedPaths: string[]) {
  const cleanupErrors: unknown[] = [];
  try {
    if (uploadedPaths.length) {
      const { error } = await supabase.storage.from("queen-images").remove(uploadedPaths);
      if (error) cleanupErrors.push(error);
    }
  } catch (cause) {
    cleanupErrors.push(cause);
  }
  try {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) cleanupErrors.push(error);
  } catch (cause) {
    cleanupErrors.push(cause);
  }
  if (cleanupErrors.length) console.error("Room creation rollback failed", cleanupErrors);
}

class ApiRouteError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
  }
}
