import { join } from "node:path";

/** Shared locations for the icon scripts (run from anywhere with `bun run icons:*`). */
export const ROOT_DIR = join(import.meta.dir, "../..");
export const WEB_SRC_DIR = join(ROOT_DIR, "apps/web/src");
/** Source SVG files (also served statically by the web app). */
export const ICONS_SRC_DIR = join(ROOT_DIR, "apps/web/public/icons");
/** Generated React components, imported as `@/components/icons`. */
export const ICONS_DEST_DIR = join(WEB_SRC_DIR, "components/icons");
