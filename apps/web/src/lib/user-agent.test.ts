import { describe, expect, test } from "bun:test";
import { describeUserAgent } from "./user-agent";

describe("describeUserAgent", () => {
  test("names the browser and the system", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
      ),
    ).toEqual({ label: "Chrome sur Windows", mobile: false });
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0",
      ).label,
    ).toBe("Edge sur Windows");
  });

  test("detects mobile devices", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ label: "Safari sur iOS", mobile: true });
  });

  test("falls back to a neutral label", () => {
    expect(describeUserAgent(undefined).label).toBe("Appareil inconnu");
    expect(describeUserAgent("curl/8.0").label).toBe("Appareil inconnu");
  });
});
