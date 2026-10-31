import { z } from "zod";
import { isReadableText, UNREADABLE_TEXT_MESSAGE } from "./text";

/** Must stay aligned with the Better Auth `emailAndPassword` options in apps/api. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const emailField = z
  .string()
  .trim()
  .min(1, "Saisissez votre adresse email.")
  .email("Adresse email invalide.");

export const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, `Au plus ${PASSWORD_MAX_LENGTH} caractères.`);

export const nameField = z
  .string()
  .trim()
  .min(1, "Saisissez votre nom.")
  .max(80, "Au plus 80 caractères.")
  .refine(isReadableText, UNREADABLE_TEXT_MESSAGE);

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Saisissez votre mot de passe."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resendVerificationSchema = z.object({ email: emailField });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Code of an authenticator app (TOTP): 6 digits, spaces ignored. */
export const totpCodeField = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres."));

/**
 * Backup code, as Better Auth generates them (« abcde-12345 », case-sensitive).
 * Spaces are ignored and the dash is added back when it was left out.
 */
export const backupCodeField = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .transform((value) =>
    /^[A-Za-z0-9]{10}$/.test(value) ? `${value.slice(0, 5)}-${value.slice(5)}` : value,
  )
  .pipe(
    z
      .string()
      .regex(/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/, "Un code de secours contient 10 caractères."),
  );

/** Second step of sign-in, with an authenticator code. */
export const twoFactorSignInSchema = z.object({
  code: totpCodeField,
  trustDevice: z.boolean(),
});

/** Second step of sign-in, with a backup code. */
export const backupCodeSignInSchema = z.object({
  code: backupCodeField,
  trustDevice: z.boolean(),
});

/** Enabling, disabling 2FA or renewing backup codes asks for the password again. */
export const confirmPasswordSchema = z.object({
  password: z.string().min(1, "Saisissez votre mot de passe."),
});

/** Last step of enabling 2FA: the first code shown by the app. */
export const verifyTotpSchema = z.object({ code: totpCodeField });

/** Public, non-sensitive instance configuration exposed by the API. */
export const socialProviderIds = ["google", "github"] as const;
export type SocialProviderId = (typeof socialProviderIds)[number];

export const publicConfigSchema = z.object({
  socialProviders: z.array(z.enum(socialProviderIds)),
});
export type PublicConfig = z.infer<typeof publicConfigSchema>;
