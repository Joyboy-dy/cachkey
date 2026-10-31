import { describe, expect, test } from "bun:test";
import {
  decryptSecret,
  encryptSecret,
  secretAad,
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
    const owner = { environmentId: "env-1", brickId: null };
    const first = encryptSecret(dataKey, owner, value);
    const second = encryptSecret(dataKey, owner, value);
    expect(first).not.toBe(second);
    expect(first).not.toContain("postgres");
    expect(decryptSecret(dataKey, owner, first)).toBe(value);
    expect(decryptSecret(dataKey, owner, encryptSecret(dataKey, owner, ""))).toBe("");

    // Copied to another environment, or tampered with: refused.
    expect(() =>
      decryptSecret(dataKey, { environmentId: "env-2", brickId: null }, first),
    ).toThrow();
    const [version, iv, body = ""] = first.split(".");
    const flipped = Buffer.from(body, "base64");
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    expect(() =>
      decryptSecret(dataKey, owner, `${version}.${iv}.${flipped.toString("base64")}`),
    ).toThrow();
  });

  test("binds values to their brick, the main brick keeping the original binding", () => {
    const dataKey = generateDataKey();
    const main = { environmentId: "env-1", brickId: null };
    const web = { environmentId: "env-1", brickId: "brick-web" };
    expect(secretAad(main)).toBe("secret:env-1");

    const value = encryptSecret(dataKey, web, "token");
    expect(decryptSecret(dataKey, web, value)).toBe("token");
    // Copied to another brick of the same environment: refused.
    expect(() => decryptSecret(dataKey, main, value)).toThrow();
    expect(() => decryptSecret(dataKey, { ...web, brickId: "brick-api" }, value)).toThrow();
  });
});
