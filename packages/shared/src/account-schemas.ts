import { z } from "zod";
import { emailField, nameField, newPasswordField } from "./auth-schemas";

export const profileSchema = z.object({ name: nameField });
export type ProfileInput = z.infer<typeof profileSchema>;

/** Seed of the user's DiceBear « Clay » avatar (see apps/web/src/lib/avatar.ts). */
export const avatarSchema = z.object({
  avatarSeed: z.string().trim().min(1).max(64),
});
export type AvatarInput = z.infer<typeof avatarSchema>;

export const changeEmailSchema = z.object({ newEmail: emailField });
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

const confirmPassword = z.string();
const passwordsMatch = {
  path: ["confirmPassword"],
  message: "Les mots de passe ne correspondent pas.",
};

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
    newPassword: newPasswordField,
    confirmPassword,
    revokeOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, passwordsMatch)
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Choisissez un mot de passe différent de l’actuel.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const setPasswordSchema = z
  .object({ newPassword: newPasswordField, confirmPassword })
  .refine((data) => data.newPassword === data.confirmPassword, passwordsMatch);
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** Phrase the user types to confirm the account deletion request. */
export const DELETE_ACCOUNT_PHRASE = "SUPPRIMER";

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === DELETE_ACCOUNT_PHRASE, {
      message: `Saisissez ${DELETE_ACCOUNT_PHRASE} pour confirmer.`,
    }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
