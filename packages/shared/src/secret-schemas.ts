import { z } from "zod";

/** Environments created with every new project. */
export const defaultEnvironments = [
  { name: "development", slug: "development" },
  { name: "staging", slug: "staging" },
  { name: "production", slug: "production" },
] as const;

export const MAX_ENVIRONMENTS = 20;
export const MAX_SECRETS_PER_ENVIRONMENT = 500;
/** 64 KiB: enough for certificates and private keys. */
export const MAX_SECRET_VALUE_LENGTH = 65_536;

const environmentName = z
  .string()
  .trim()
  .min(1, "Indiquez un nom.")
  .max(40, "Au plus 40 caractères.")
  .refine((value) => /[\p{L}\p{N}]/u.test(value), "Utilisez au moins une lettre ou un chiffre.");

export const environmentSchema = z.object({ name: environmentName });
export type EnvironmentInput = z.infer<typeof environmentSchema>;

/** Variable names accepted by shells and `.env` loaders: `API_KEY`, `next_public_url`… */
export const SECRET_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const secretKeySchema = z
  .string()
  .trim()
  .min(1, "Indiquez un nom.")
  .max(128, "Au plus 128 caractères.")
  .regex(
    SECRET_KEY_PATTERN,
    "Lettres, chiffres et « _ » uniquement, sans commencer par un chiffre.",
  );

export const secretValueSchema = z
  .string()
  .max(MAX_SECRET_VALUE_LENGTH, "La valeur est trop longue (64 Ko au plus).");

export const secretSchema = z.object({ key: secretKeySchema, value: secretValueSchema });
export type SecretInput = z.infer<typeof secretSchema>;

/** Rename and/or change the value; a value change creates a new version. */
export const secretUpdateSchema = z.object({
  key: secretKeySchema.optional(),
  value: secretValueSchema.optional(),
});
export type SecretUpdateInput = z.infer<typeof secretUpdateSchema>;

export const importSchema = z.object({
  content: z.string().max(1_000_000, "Le fichier est trop volumineux."),
  /** Replace the value of variables that already exist (otherwise they are skipped). */
  overwrite: z.boolean(),
});
export type ImportInput = z.infer<typeof importSchema>;

const authorSchema = z
  .object({ id: z.string(), name: z.string(), avatarSeed: z.string().nullable() })
  .nullable();

export const environmentDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  secretCount: z.number(),
});
export type EnvironmentDto = z.infer<typeof environmentDtoSchema>;

/** A variable without its value: values are only sent on explicit reveal. */
export const secretDtoSchema = z.object({
  id: z.string(),
  key: z.string(),
  version: z.number(),
  updatedAt: z.string(),
  updatedBy: authorSchema,
});
export type SecretDto = z.infer<typeof secretDtoSchema>;

export const secretVersionDtoSchema = z.object({
  version: z.number(),
  createdAt: z.string(),
  createdBy: authorSchema,
});
export type SecretVersionDto = z.infer<typeof secretVersionDtoSchema>;

export const importResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  unchanged: z.number(),
  skipped: z.number(),
  /** Line numbers that could not be read. */
  invalidLines: z.array(z.number()),
});
export type ImportResult = z.infer<typeof importResultSchema>;
