import { beforeEach, describe, expect, it } from "vitest";
import { createDeviceKey, deviceHash, deviceKeyFromRequest, validDeviceKey } from "./device";

describe("device credentials", () => {
  beforeEach(() => { process.env.DEVICE_COOKIE_SECRET = "test-secret-that-is-not-used-in-production"; });

  it("creates a signed credential that validates", () => {
    const key = createDeviceKey();
    expect(validDeviceKey(key)).toBe(key);
  });

  it("rejects tampered credentials", () => {
    const key = createDeviceKey();
    expect(validDeviceKey(`${key}changed`)).toBeNull();
  });

  it("prefers the recovery header over the cookie", () => {
    const headerKey = createDeviceKey();
    const cookieKey = createDeviceKey();
    const request = new Request("https://example.test", { headers: { "X-RAQ-Device": headerKey, cookie: `raq_device=${cookieKey}` } });
    expect(deviceKeyFromRequest(request)).toBe(headerKey);
  });

  it("produces stable, non-plain device hashes", () => {
    const key = createDeviceKey();
    expect(deviceHash(key)).toBe(deviceHash(key));
    expect(deviceHash(key)).not.toContain(key);
    expect(deviceHash(key)).toHaveLength(64);
  });
});
