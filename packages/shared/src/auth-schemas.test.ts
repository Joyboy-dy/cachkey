import { describe, expect, test } from "bun:test";
import {
  PASSWORD_MIN_LENGTH,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./auth-schemas";

const validSignUp = {
  name: "Alex Martin",
  email: "alex@example.com",
  password: "a".repeat(PASSWORD_MIN_LENGTH),
  confirmPassword: "a".repeat(PASSWORD_MIN_LENGTH),
};

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("signUpSchema", () => {
  test("accepts a valid payload and trims name and email", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      name: "  Alex  ",
      email: " alex@example.com ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Alex");
    expect(result.data?.email).toBe("alex@example.com");
  });

  test("rejects a password shorter than the minimum", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: short,
      confirmPassword: short,
    });
    expect(result.success).toBe(false);
  });

  test("reports mismatching passwords on the confirmation field", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      confirmPassword: "different-password",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("signInSchema", () => {
  test("uses user-facing French messages", () => {
    expect(firstMessage(signInSchema.safeParse({ email: "", password: "x" }))).toBe(
      "Saisissez votre adresse email.",
    );
    expect(firstMessage(signInSchema.safeParse({ email: "nope", password: "x" }))).toBe(
      "Adresse email invalide.",
    );
  });
});

describe("resetPasswordSchema", () => {
  test("requires both passwords to match", () => {
    const password = "b".repeat(PASSWORD_MIN_LENGTH);
    expect(resetPasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(
      true,
    );
    expect(
      resetPasswordSchema.safeParse({ password, confirmPassword: `${password}x` }).success,
    ).toBe(false);
  });
});
