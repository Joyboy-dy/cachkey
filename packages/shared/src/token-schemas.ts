import { z } from "zod";
import { isReadableText, UNREADABLE_TEXT_MESSAGE } from "./text";

/*
 * Service tokens: read-only access to one environment, for servers, scripts and the CLI.
 */

/** Every token starts with this prefix, so it is recognisable in logs and secret scanners. */
export const SERVICE_TOKEN_PREFIX = "ck_";

export const MAX_TOKENS_PER_PROJECT = 50;

/** Lifetimes offered at creation, in days; null means it never expires. */
export const tokenLifetimes = [30, 90, 365, null] as const;
export type TokenLifetime = (typeof tokenLifetimes)[number];

export const serviceTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Donnez un nom à ce jeton.")
    .max(60, "Le nom ne peut pas dépasser 60 caractères.")
    .refine(isReadableText, UNREADABLE_TEXT_MESSAGE),
  environmentId: z.string().min(1, "Choisissez un environnement."),
  expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365), z.null()]),
});
export type ServiceTokenInput = z.infer<typeof serviceTokenSchema>;

export const serviceTokenDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Beginning of the token, to recognise it (`ck_AbCd…`). */
  prefix: z.string(),
  environment: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  createdBy: z
    .object({ id: z.string(), name: z.string(), avatarSeed: z.string().nullable() })
    .nullable(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
});
export type ServiceTokenDto = z.infer<typeof serviceTokenDtoSchema>;

/** Creation response: the only time the full token is sent. */
export const createdServiceTokenSchema = z.object({
  token: z.string(),
  serviceToken: serviceTokenDtoSchema,
});
export type CreatedServiceToken = z.infer<typeof createdServiceTokenSchema>;
