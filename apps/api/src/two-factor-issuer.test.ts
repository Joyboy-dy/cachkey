import { describe, expect, test } from "bun:test";
import { twoFactorIssuer } from "./two-factor-issuer";

describe("twoFactorIssuer", () => {
  test("production instance: plain name", () => {
    expect(twoFactorIssuer("https://cachkey.example.com", "production")).toBe("Cachkey");
  });

  test("development server: marked, whatever the host", () => {
    expect(twoFactorIssuer("http://localhost:3100", "development")).toBe("Cachkey (dev)");
    expect(twoFactorIssuer("https://cachkey.example.com", "development")).toBe("Cachkey (dev)");
  });

  test("production build on a local host: marked", () => {
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://[::1]:3000",
      "http://cachkey.localhost",
      "http://cachkey.test",
    ]) {
      expect(twoFactorIssuer(url, "production")).toBe("Cachkey (dev)");
    }
  });
});
