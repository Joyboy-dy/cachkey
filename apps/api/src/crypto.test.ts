import { describe, expect, test } from "bun:test";
import {
  decryptSecret,
  encryptSecret,
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
} from "./crypto";

describe("envelope encryption", () => {
  const masterKey = generateDataKey();

  test("wraps and unwraps a project data key", () => {
    const dataKey = generateDataKey();
    const wrapped = wrapDataKey(masterKey, dataKey, "project-1");
    expect(wrapped.startsWith("v1.")).toBe(true);
    expect(unwrapDataKey(masterKey, wrapped, "project-1").equals(dataKey)).toBe(true);
    // Bound to its project and to the master key.
    expect(() => unwrapDataKey(masterKey, wrapped, "project-2")).toThrow();
    expect(() => unwrapDataKey(generateDataKey(), wrapped, "project-1")).toThrow();
  });

  test("encrypts values with a fresh IV and authenticates them", () => {
    const dataKey = generateDataKey();
    const value = "postgres://user:pässwörd@db:5432/app\nligne 2";
    const first = encryptSecret(dataKey, "env-1", value);
    const second = encryptSecret(dataKey, "env-1", value);
    expect(first).not.toBe(second);
    expect(first).not.toContain("postgres");
    expect(decryptSecret(dataKey, "env-1", first)).toBe(value);
    expect(decryptSecret(dataKey, "env-1", encryptSecret(dataKey, "env-1", ""))).toBe("");

    // Copied to another environment, or tampered with: refused.
    expect(() => decryptSecret(dataKey, "env-2", first)).toThrow();
    const [version, iv, body = ""] = first.split(".");
    const flipped = Buffer.from(body, "base64");
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    expect(() =>
      decryptSecret(dataKey, "env-1", `${version}.${iv}.${flipped.toString("base64")}`),
    ).toThrow();
  });
});
