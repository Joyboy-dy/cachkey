import { z } from "zod";

/** Must stay aligned with the Better Auth `emailAndPassword` options in apps/api. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const email = z
  .string()
  .trim()
  .min(1, "Saisissez votre adresse email.")
  .email("Adresse email invalide.");

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, `Au plus ${PASSWORD_MAX_LENGTH} caractères.`);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Saisissez votre mot de passe."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Saisissez votre nom.").max(80, "Au plus 80 caractères."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resendVerificationSchema = z.object({ email });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
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
