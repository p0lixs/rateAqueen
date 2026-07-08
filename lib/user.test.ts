import { describe, expect, it } from "vitest";
import { displayNameFromUser } from "./user";

describe("displayNameFromUser", () => {
  it("returns a trimmed valid public name", () => {
    expect(displayNameFromUser({ user_metadata: { display_name: "  Sasha  " } })).toBe("Sasha");
  });

  it.each([undefined, null, "", "A", "x".repeat(41)])("rejects invalid names", (display_name) => {
    expect(displayNameFromUser({ user_metadata: { display_name } })).toBeNull();
  });
});
