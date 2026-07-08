import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_ERROR } from "@/lib/api-errors";

const { getSupabaseAdmin, getUserFromRequest, rpc } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getUserFromRequest: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin,
  getUserFromRequest,
}));

import { POST } from "./route";

function voteRequest(body: unknown, authorization?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (authorization) headers.set("authorization", authorization);
  return new Request("https://example.test/api/votes", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseAdmin.mockReturnValue({ rpc });
    getUserFromRequest.mockResolvedValue(null);
    rpc.mockResolvedValue({ data: "accepted", error: null });
  });

  it("submits an anonymous ballot and returns its status", async () => {
    const ranking = ["queen-2", "queen-1"];

    const response = await POST(voteRequest({ token: "room-token", ranking }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "accepted" });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("submit_anonymous_ballot", {
      p_token: "room-token",
      p_ranking: ranking,
      p_user_id: null,
    });
  });

  it("forwards the authenticated user id to the ballot transaction", async () => {
    getUserFromRequest.mockResolvedValue({ id: "user-123" });

    await POST(voteRequest(
      { token: "room-token", ranking: ["queen-1"] },
      "Bearer access-token",
    ));

    expect(rpc).toHaveBeenCalledWith("submit_anonymous_ballot", {
      p_token: "room-token",
      p_ranking: ["queen-1"],
      p_user_id: "user-123",
    });
  });

  it.each([
    ["public room requires member account", API_ERROR.MEMBER_ACCOUNT_REQUIRED],
    ["voting closed", API_ERROR.VOTING_CLOSED],
    ["account already participated", API_ERROR.ACCOUNT_ALREADY_PARTICIPATED],
    ["invitation belongs to another account", API_ERROR.INVITATION_OTHER_ACCOUNT],
    ["already voted", API_ERROR.INVITATION_ALREADY_USED],
    ["invalid ranking", API_ERROR.INVALID_RANKING],
    ["unexpected database failure", API_ERROR.VOTE_SAVE_FAILED],
  ])("maps the database error %s to a safe response", async (databaseError, expected) => {
    rpc.mockResolvedValue({ data: null, error: { message: databaseError } });

    const response = await POST(voteRequest({ token: "room-token", ranking: ["queen-1"] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: expected });
  });

  it.each([
    [{ ranking: ["queen-1"] }],
    [{ token: "room-token" }],
    [{ token: "room-token", ranking: "queen-1" }],
  ])("rejects an invalid payload without calling Supabase", async (body) => {
    const response = await POST(voteRequest(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.INVALID_VOTE });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without calling Supabase", async () => {
    const response = await POST(new Request("https://example.test/api/votes", {
      method: "POST",
      body: "{not-json",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERROR.INVALID_REQUEST });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
