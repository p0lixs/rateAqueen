import { describe, expect, it } from "vitest";
import { usernameFromUser } from "./user";

describe("usernameFromUser", () => {
  it("returns a trimmed valid public name", () => {
    expect(usernameFromUser({ user_metadata: { username: "  Sasha  " } })).toBe("Sasha");
  });

  it("supports legacy display_name metadata", () => {
    expect(usernameFromUser({ user_metadata: { display_name: "Legacy" } })).toBe("Legacy");
  });

  it.each([undefined, null, "", "A", "x".repeat(41)])("rejects invalid names", (display_name) => {
    expect(usernameFromUser({ user_metadata: { display_name } })).toBeNull();
  });
});
