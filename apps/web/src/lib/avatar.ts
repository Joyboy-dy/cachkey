import { Avatar, Style } from "@dicebear/core";
import clayDefinition from "@dicebear/styles/clay.json";
import shapeGridDefinition from "@dicebear/styles/shape-grid.json";

/**
 * Avatars are generated locally with DiceBear (no third-party request, works offline and on
 * self-hosted instances). One style per kind of entity, never mixed:
 *   - users         → « Clay »       https://www.dicebear.com/styles/clay/
 *   - organisations → « Shape Grid » https://www.dicebear.com/styles/shape-grid/
 * Both styles are CC0 1.0.
 */
const clay = new Style(clayDefinition);
const shapeGrid = new Style(shapeGridDefinition);

export type AvatarUser = { id: string; avatarSeed?: string | null };

/** Seed actually used for a user: the chosen one, or the user id by default. */
export function userAvatarSeed(user: AvatarUser): string {
  return user.avatarSeed || user.id;
}

/** SVG data URI of a user avatar (Clay). */
export function userAvatarDataUri(seed: string): string {
  return new Avatar(clay, { seed }).toDataUri();
}

/** SVG data URI of an organisation avatar (Shape Grid), seeded with the organisation id. */
export function organizationAvatarDataUri(seed: string): string {
  return new Avatar(shapeGrid, { seed }).toDataUri();
}

/** Random seeds for the « autres propositions » of the avatar picker. */
export function randomAvatarSeeds(count: number): string[] {
  return Array.from({ length: count }, () => crypto.randomUUID().slice(0, 12));
}
