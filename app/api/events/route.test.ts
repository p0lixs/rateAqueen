import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_ERROR } from "@/lib/api-errors";

const { getSupabaseAdmin, getUserFromRequest } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getUserFromRequest: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getSupabaseAdmin, getUserFromRequest }));

import { POST } from "./route";

function createRequest(overrides: { queens?: unknown; people?: unknown; photo?: File; visibility?: string } = {}) {
  const form = new FormData();
  form.set("title", "All Stars");
  form.set("queens", JSON.stringify(overrides.queens ?? [{ name: "Alba" }, { name: "Berta" }]));
  form.set("people", JSON.stringify(overrides.people ?? []));
  form.set("visibility", overrides.visibility ?? "public");
  if (overrides.photo) form.set("photo_0", overrides.photo);
  return new Request("https://example.test/api/events", { method: "POST", body: form });
}

function supabaseMock(options: { queenError?: unknown; uploadError?: unknown } = {}) {
  const remove = vi.fn().mockResolvedValue({ error: null });
  const upload = vi.fn().mockResolvedValue({ error: options.uploadError ?? null });
  const eq = vi.fn().mockResolvedValue({ error: null });
  const deleteEvent = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === "events") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null }) })),
        })),
        delete: deleteEvent,
      };
    }
    return { insert: vi.fn().mockResolvedValue({ error: table === "queens" ? options.queenError ?? null : null }) };
  });
  const bucket = {
    upload,
    remove,
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://images.test/queen.jpg" } })),
  };
  return { client: { from, storage: { from: vi.fn(() => bucket) } }, remove, deleteEvent, eq };
}

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserFromRequest.mockResolvedValue({ id: "user-1", user_metadata: { username: "host" } });
  });

  it.each([
    { queens: [{ name: "Only one" }] },
    { queens: [{ name: "Same" }, { name: " same " }] },
    { queens: [{ name: "" }, { name: "Berta" }] },
    { queens: "invalid" },
  ])("rejects invalid room data before writing", async (overrides) => {
    const response = await POST(createRequest(overrides));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.INCOMPLETE_DATA });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects invalid photos before creating the event", async () => {
    const photo = new File(["text"], "queen.gif", { type: "image/gif" });
    const response = await POST(createRequest({ photo }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.INVALID_QUEEN_PHOTO });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("removes uploaded images and the event when a later insert fails", async () => {
    const mock = supabaseMock({ queenError: { message: "insert failed" } });
    getSupabaseAdmin.mockReturnValue(mock.client);

    const photo = new File(["image"], "queen.png", { type: "image/png" });
    const response = await POST(createRequest({ photo }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.ROOM_CREATE_FAILED });
    expect(mock.remove).toHaveBeenCalledWith([expect.stringMatching(/^event-1\/.+\.png$/)]);
    expect(mock.deleteEvent).toHaveBeenCalledOnce();
    expect(mock.eq).toHaveBeenCalledWith("id", "event-1");
  });

  it("deletes the event when the first upload fails", async () => {
    const mock = supabaseMock({ uploadError: { message: "upload failed" } });
    getSupabaseAdmin.mockReturnValue(mock.client);

    const photo = new File(["image"], "queen.png", { type: "image/png" });
    const response = await POST(createRequest({ photo }));

    expect(response.status).toBe(500);
    expect(mock.remove).not.toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "event-1");
  });
});
