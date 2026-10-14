import { describe, expect, test } from "bun:test";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  test("keeps same-origin relative paths", () => {
    expect(safeRedirectPath("/welcome")).toBe("/welcome");
    expect(safeRedirectPath("/welcome?tab=1#top")).toBe("/welcome?tab=1#top");
  });

  test("rejects anything that could leave the origin", () => {
    for (const value of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "evil.com",
      "",
      "javascript:alert(1)",
      // Browsers strip tabs and line breaks: these would become `//evil.com`.
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/a\\b",
    ]) {
      expect(safeRedirectPath(value)).toBeUndefined();
    }
  });

  test("rejects non-string values", () => {
    expect(safeRedirectPath(undefined)).toBeUndefined();
    expect(safeRedirectPath(["/welcome"])).toBeUndefined();
  });
});
