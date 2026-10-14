import type { MemberRole } from "@cachkey/shared";

/** User-facing labels of organisation roles (never display the raw value). */
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Gère l’organisation, ses membres et ses projets, et peut la supprimer.",
  admin: "Gère les membres et les projets.",
  member: "Consulte les projets.",
};

export function roleLabel(role: string): string {
  return role in ROLE_LABELS ? ROLE_LABELS[role as MemberRole] : "Membre";
}
