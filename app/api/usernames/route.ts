import { NextResponse } from "next/server";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim() || "";
  if (username.length < 2 || username.length > 40) {
    return NextResponse.json({ available: false });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("usernames")
    .select("user_id")
    .eq("normalized_username", username.toLocaleLowerCase("en-US"))
    .maybeSingle();

  if (error) return NextResponse.json({ error: API_ERROR.USERNAME_CHECK_FAILED }, { status: 500 });
  return NextResponse.json({ available: !data }, { headers: { "Cache-Control": "no-store" } });
}
