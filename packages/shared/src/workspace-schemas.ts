import { z } from "zod";

/** Roles of a member inside an organisation (Better Auth organization plugin). */
export const memberRoles = ["owner", "admin", "member"] as const;
export type MemberRole = (typeof memberRoles)[number];

/** Owners and admins manage the organisation and its projects; members can read. */
export function canManage(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Lower-case, accent-free, dash-separated identifier usable in a URL. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

const organizationName = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères.")
  .max(60, "Au plus 60 caractères.");

export const organizationSchema = z.object({ name: organizationName });
export type OrganizationInput = z.infer<typeof organizationSchema>;

const projectName = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères.")
  .max(60, "Au plus 60 caractères.")
  .refine((value) => slugify(value).length > 0, "Utilisez au moins une lettre ou un chiffre.");

const projectDescription = z.string().trim().max(280, "Au plus 280 caractères.");

export const projectSchema = z.object({
  name: projectName,
  description: projectDescription,
});
export type ProjectInput = z.infer<typeof projectSchema>;

/** Project as returned by the API. */
export const projectDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectDto = z.infer<typeof projectDtoSchema>;

/** Organisations of the current user and the active one, with the user's role in it. */
export const workspaceSchema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  active: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: z.enum(memberRoles),
    })
    .nullable(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

/** Member of the active organisation, as returned by the API. */
export const memberDtoSchema = z.object({
  id: z.string(),
  role: z.enum(memberRoles),
  joinedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarSeed: z.string().nullable(),
  }),
});
export type MemberDto = z.infer<typeof memberDtoSchema>;
