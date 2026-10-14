import { describe, expect, test } from "bun:test";
import { parseDotenv, serializeDotenv } from "./dotenv";
import { secretKeySchema } from "./secret-schemas";

describe("parseDotenv", () => {
  test("reads plain assignments, comments and export prefixes", () => {
    const result = parseDotenv(
      [
        "# Base de données",
        "DATABASE_URL=postgres://localhost/app",
        "",
        "export PORT = 3000",
        "EMPTY=",
        "DEBUG=true # inline comment",
        "HASH=abc#def",
      ].join("\n"),
    );
    expect(result.invalidLines).toEqual([]);
    expect(result.entries).toEqual([
      { key: "DATABASE_URL", value: "postgres://localhost/app" },
      { key: "PORT", value: "3000" },
      { key: "EMPTY", value: "" },
      { key: "DEBUG", value: "true" },
      { key: "HASH", value: "abc#def" },
    ]);
  });

  test("handles quotes, escapes and multi-line values", () => {
    const result = parseDotenv(
      [
        "SINGLE='a \\n b # not a comment'",
        'DOUBLE="line1\\nline2 \\"quoted\\""',
        'KEY="-----BEGIN KEY-----',
        "abc",
        '-----END KEY-----"',
        "TICK=`x 'y' \"z\"`",
      ].join("\r\n"),
    );
    expect(result.invalidLines).toEqual([]);
    expect(result.entries).toEqual([
      { key: "SINGLE", value: "a \\n b # not a comment" },
      { key: "DOUBLE", value: 'line1\nline2 "quoted"' },
      { key: "KEY", value: "-----BEGIN KEY-----\nabc\n-----END KEY-----" },
      { key: "TICK", value: "x 'y' \"z\"" },
    ]);
  });

  test("reports unreadable lines and keeps the last duplicate", () => {
    const result = parseDotenv('A=1\nnot an assignment\n1BAD=x\nA=2\nOPEN="never closed');
    expect(result.entries).toEqual([{ key: "A", value: "2" }]);
    expect(result.invalidLines).toEqual([2, 3, 5]);
  });
});

describe("serializeDotenv", () => {
  test("round-trips any value", () => {
    const entries = [
      { key: "PLAIN", value: "postgres://u:p@host:5432/db?ssl=true" },
      { key: "SPACES", value: "hello world" },
      { key: "TRICKY", value: 'a "b" \\ c # d\nnext\tline' },
      { key: "EMPTY", value: "" },
    ];
    const text = serializeDotenv(entries, "Projet : Démo");
    expect(text.startsWith("# Projet : Démo\n")).toBe(true);
    expect(text).toContain("PLAIN=postgres://u:p@host:5432/db?ssl=true\n");
    expect(parseDotenv(text).entries).toEqual(entries);
  });
});

describe("secretKeySchema", () => {
  test("accepts shell-compatible names only", () => {
    expect(secretKeySchema.safeParse("API_KEY").success).toBe(true);
    expect(secretKeySchema.safeParse("_private2").success).toBe(true);
    expect(secretKeySchema.safeParse("2FA").success).toBe(false);
    expect(secretKeySchema.safeParse("MY-KEY").success).toBe(false);
    expect(secretKeySchema.safeParse("").success).toBe(false);
  });
});

describe("isReadableText", () => {
  test("accepts accents and refuses text corrupted by a wrong encoding", async () => {
    const { isReadableText } = await import("./text");
    const { nameField } = await import("./auth-schemas");
    expect(isReadableText("Invitée Éléonore çà")).toBe(true);
    expect(isReadableText("Invit\uFFFDe")).toBe(false);
    expect(nameField.safeParse("Invit\uFFFDe").success).toBe(false);
  });
});
