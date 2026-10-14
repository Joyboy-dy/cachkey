import { z } from "zod";

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
  .max(80, "Au plus 80 caractères.");

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

/** Public, non-sensitive instance configuration exposed by the API. */
export const socialProviderIds = ["google", "github"] as const;
export type SocialProviderId = (typeof socialProviderIds)[number];

export const publicConfigSchema = z.object({
  socialProviders: z.array(z.enum(socialProviderIds)),
});
export type PublicConfig = z.infer<typeof publicConfigSchema>;
