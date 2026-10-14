import { describe, expect, test } from "bun:test";
import {
  GENERIC_ERROR,
  getAuthErrorMessage,
  getOAuthErrorMessage,
  RATE_LIMIT_ERROR,
} from "./errors";

describe("getAuthErrorMessage", () => {
  test("translates known Better Auth codes", () => {
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "Email ou mot de passe incorrect.",
    );
  });

  test("never exposes unknown codes or raw messages", () => {
    expect(getAuthErrorMessage({ code: "SOME_INTERNAL_CODE", status: 500 })).toBe(GENERIC_ERROR);
    expect(getAuthErrorMessage(null)).toBe(GENERIC_ERROR);
  });

  test("maps rate limiting regardless of the code", () => {
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 429 })).toBe(
      RATE_LIMIT_ERROR,
    );
  });
});

describe("getOAuthErrorMessage", () => {
  test("is case-insensitive and has a safe fallback", () => {
    expect(getOAuthErrorMessage("ACCESS_DENIED")).toBe("La connexion a été annulée.");
    expect(getOAuthErrorMessage("whatever")).toBe("La connexion avec ce fournisseur a échoué.");
  });
});
