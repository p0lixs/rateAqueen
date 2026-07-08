import { describe, expect, it } from "vitest";
import { API_ERROR, translateApiError } from "./api-errors";

describe("API error translations", () => {
  it.each(Object.values(API_ERROR))("translates %s into Spanish and English", (code) => {
    expect(translateApiError(code, "es")).toBeTruthy();
    expect(translateApiError(code, "en")).toBeTruthy();
    expect(translateApiError(code, "es")).not.toBe(code);
    expect(translateApiError(code, "en")).not.toBe(code);
  });

  it("returns undefined for unknown server errors", () => {
    expect(translateApiError("UNKNOWN_ERROR", "es")).toBeUndefined();
  });
});
