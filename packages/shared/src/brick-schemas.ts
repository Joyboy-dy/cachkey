import { z } from "zod";
import { isReadableText, UNREADABLE_TEXT_MESSAGE } from "./text";

/*
 * Bricks: independent parts of a project (front-end, API…), each with its own variables in
 * every environment. Environments, members and tokens stay at the project level.
 *
 * - Every project has a « main » brick: a project that does not use bricks keeps all its
 *   variables there, and the interface shows no brick at all.
 * - Shared variables (`shared`) are inherited by every brick; a brick may redefine one.
 * - One level only: no brick inside a brick.
 */

/** Bricks of a project, the main one included (shared variables not counted). */
export const MAX_BRICKS = 10;

/** Main brick created with every project. */
export const mainBrick = { name: "Principale", slug: "principale" } as const;

/** Shared variables, stored as a hidden brick created with every project. */
export const sharedBrick = { name: "Partagées", slug: "shared" } as const;

/** Identifier of the shared variables in URLs and the CLI (`?brick=shared`, `--brick shared`). */
export const SHARED_BRICK_SLUG = sharedBrick.slug;

export const brickKinds = ["main", "shared", "custom"] as const;
export type BrickKind = (typeof brickKinds)[number];

export const brickSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Indiquez un nom.")
    .max(40, "Au plus 40 caractères.")
    .refine((value) => /[\p{L}\p{N}]/u.test(value), "Utilisez au moins une lettre ou un chiffre.")
    .refine(isReadableText, UNREADABLE_TEXT_MESSAGE),
});
export type BrickInput = z.infer<typeof brickSchema>;

/** A brick of the project (never the shared variables, which have no entry in the list). */
export const brickDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  /** The brick of projects that do not use bricks; it cannot be deleted. */
  main: z.boolean(),
});
export type BrickDto = z.infer<typeof brickDtoSchema>;
