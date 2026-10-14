/**
 * Maps Better Auth error codes to user-facing French messages.
 * Unknown codes fall back to a generic message — raw server errors are never shown.
 */
const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_EMAIL: "Adresse email invalide.",
  INVALID_PASSWORD: "Mot de passe incorrect.",
  EMAIL_NOT_VERIFIED: "Votre adresse email n’est pas encore confirmée.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse email.",
  PASSWORD_TOO_SHORT: "Le mot de passe est trop court.",
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
  INVALID_TOKEN: "Ce lien est invalide ou a expiré.",
  TOKEN_EXPIRED: "Ce lien a expiré.",
  EMAIL_ALREADY_VERIFIED: "Cette adresse email est déjà confirmée.",
  FAILED_TO_CREATE_USER: "Impossible de créer le compte pour le moment.",
};

const oauthMessages: Record<string, string> = {
  access_denied: "La connexion a été annulée.",
  account_not_linked:
    "Un compte existe déjà avec cette adresse. Connectez-vous avec votre méthode habituelle.",
  email_not_found: "Le fournisseur n’a pas communiqué d’adresse email.",
  unable_to_get_user_info: "Impossible de récupérer votre profil auprès du fournisseur.",
  state_mismatch: "La session de connexion a expiré. Réessayez.",
  please_restart_the_process: "La session de connexion a expiré. Réessayez.",
  invalid_code: "La connexion avec le fournisseur a échoué. Réessayez.",
};

export const GENERIC_ERROR = "Une erreur est survenue. Réessayez dans un instant.";
export const RATE_LIMIT_ERROR = "Trop de tentatives. Patientez un instant avant de réessayer.";

type AuthClientError = { code?: string; status?: number } | null | undefined;

export function getAuthErrorMessage(error: AuthClientError): string {
  if (!error) return GENERIC_ERROR;
  if (error.status === 429) return RATE_LIMIT_ERROR;
  return (error.code && messages[error.code]) || GENERIC_ERROR;
}

/** Error codes that Better Auth appends as `?error=` after an OAuth redirect. */
export function getOAuthErrorMessage(code: string): string {
  return oauthMessages[code.toLowerCase()] ?? "La connexion avec ce fournisseur a échoué.";
}
