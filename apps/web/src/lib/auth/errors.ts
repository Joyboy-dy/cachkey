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
  FAILED_TO_UPDATE_USER: "Impossible d’enregistrer vos modifications pour le moment.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Aucun mot de passe n’est encore défini pour ce compte.",
  PASSWORD_ALREADY_SET: "Un mot de passe est déjà défini pour ce compte.",
  USER_ALREADY_HAS_PASSWORD: "Un mot de passe est déjà défini pour ce compte.",
  FAILED_TO_UNLINK_LAST_ACCOUNT:
    "Impossible de retirer votre seule méthode de connexion. Ajoutez-en une autre d’abord.",
  ACCOUNT_NOT_FOUND: "Cette connexion n’existe plus.",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Ce compte est déjà relié à un autre utilisateur.",
  LINKED_ACCOUNT_ALREADY_EXISTS: "Ce compte est déjà relié.",
  SESSION_EXPIRED: "Votre session a expiré. Reconnectez-vous pour continuer.",
  SESSION_NOT_FRESH: "Pour des raisons de sécurité, reconnectez-vous avant cette action.",
  UNAUTHORIZED: "Votre session a expiré. Reconnectez-vous pour continuer.",
  CHANGE_EMAIL_DISABLED: "Le changement d’adresse email n’est pas disponible.",
  VALIDATION_ERROR: "Certaines informations sont invalides.",
  FORBIDDEN: "Vous n’avez pas les droits nécessaires pour cette action.",
  NO_ACTIVE_ORGANIZATION: "Sélectionnez d’abord une organisation.",
  PROJECT_NOT_FOUND: "Ce projet n’existe pas ou a été supprimé.",
  ENVIRONMENT_NOT_FOUND: "Cet environnement n’existe pas ou a été supprimé.",
  TOO_MANY_ENVIRONMENTS: "Ce projet a atteint le nombre maximal d’environnements (20).",
  SECRET_NOT_FOUND: "Cette variable n’existe plus. Actualisez la page.",
  SECRET_ALREADY_EXISTS: "Une variable porte déjà ce nom dans cet environnement.",
  TOO_MANY_SECRETS: "Cet environnement a atteint le nombre maximal de variables (500).",
  VERSION_NOT_FOUND: "Cette version n’existe plus.",
  ORGANIZATION_ALREADY_EXISTS: "Cet identifiant d’organisation est déjà utilisé.",
  ORGANIZATION_SLUG_ALREADY_TAKEN: "Cet identifiant d’organisation est déjà utilisé.",
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS:
    "Vous avez atteint le nombre maximal d’organisations.",
  ORGANIZATION_NOT_FOUND: "Cette organisation n’existe plus.",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
    "Vous n’avez pas les droits nécessaires pour modifier cette organisation.",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION:
    "Seul le propriétaire peut supprimer cette organisation.",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "Vous ne pouvez pas modifier le rôle de ce membre.",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "Vous ne pouvez pas retirer ce membre.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
    "Vous êtes le seul propriétaire : supprimez l’organisation ou nommez un autre propriétaire.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
    "L’organisation doit garder au moins un propriétaire.",
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION: "Vous ne faites pas partie de cette organisation.",
  YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION:
    "Vous ne faites pas partie de cette organisation.",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION:
    "Vous ne pouvez pas créer de nouvelle organisation.",
  MEMBER_NOT_FOUND: "Ce membre ne fait plus partie de l’organisation.",
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
