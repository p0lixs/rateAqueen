import type { getSupabaseAdmin } from "@/lib/supabase";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
type EventWithDeadline = { id: string; status: string; closes_at?: string | null };

export function eventIsExpired(event: EventWithDeadline, now = new Date()) {
  return event.status !== "results" && Boolean(event.closes_at) && new Date(event.closes_at as string).getTime() <= now.getTime();
}

export async function closeExpiredEvent(supabase: SupabaseAdmin, event: EventWithDeadline) {
  if (!eventIsExpired(event)) return event.status;
  const { error } = await supabase
    .from("events")
    .update({ status: "results" })
    .eq("id", event.id)
    .neq("status", "results");
  if (error) throw error;
  return "results";
}
