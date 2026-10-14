/**
 * Normalises icon imports in apps/web/src to the generated barrel:
 *
 *   import { GithubIcon } from "@/components/icons/GithubIcon";  // or /github, default import…
 *   → import { GithubIcon } from "@/components/icons";
 *
 *   bun run icons:migrate          # rewrite files
 *   bun run icons:migrate --check  # report only, exit 1 if something would change
 *
 * Run after `icons:generate` when icons were renamed or imported file-by-file.
 * Only files under apps/web/src are touched (generated icons excluded).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { toComponentName } from "./icon-naming";
import { ICONS_DEST_DIR, ICONS_SRC_DIR, ROOT_DIR, WEB_SRC_DIR } from "./paths";

const BARREL = "@/components/icons";
const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRS = new Set(["node_modules", "dist", ".output", ".tanstack"]);

type IconMapping = { componentName: string; importPaths: Set<string> };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (TARGET_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function createMappings(): IconMapping[] {
  if (!existsSync(ICONS_SRC_DIR)) {
    console.error(`Dossier source introuvable : ${ICONS_SRC_DIR}`);
    process.exit(1);
  }
  return readdirSync(ICONS_SRC_DIR)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => {
      const baseName = basename(file, ".svg");
      const componentName = toComponentName(file);
      const variants = [baseName, baseName.replace(/-icon$/i, ""), componentName];
      return {
        componentName,
        importPaths: new Set(
          variants.flatMap((variant) => [
            `${BARREL}/${variant}`,
            `${BARREL}/${variant.toLowerCase()}`,
          ]),
        ),
      };
    });
}

function parseNamedImports(list: string): { imported: string; local: string }[] {
  return list
    .split(",")
    .map((item) => item.trim().replace(/^type\s+/, ""))
    .filter(Boolean)
    .map((item) => {
      const [imported = item, local = imported] = item.split(/\s+as\s+/).map((part) => part.trim());
      return { imported, local };
    });
}

function renameIdentifier(content: string, from: string, to: string): string {
  if (from === to) return content;
  return content.replace(new RegExp(`(?<![\\w$.])${escapeRegExp(from)}(?![\\w$])`, "g"), to);
}

/** Returns the rewritten file content, or null when nothing changes. */
function migrateFile(content: string, mappings: IconMapping[]): string | null {
  const byPath = new Map<string, string>();
  for (const mapping of mappings) {
    for (const path of mapping.importPaths) byPath.set(path, mapping.componentName);
  }

  let result = content;
  const needed = new Set<string>();
  const renames: [string, string][] = [];

  // 1. Direct imports from an icon file → collect and remove.
  const directImport =
    /import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+["'](@\/components\/icons\/[^"']+)["'];?[ \t]*\n?/g;
  result = result.replace(
    directImport,
    (match, defaultName: string | undefined, named: string | undefined, path: string) => {
      const componentName = byPath.get(path);
      if (!componentName) return match;
      needed.add(componentName);
      if (defaultName) renames.push([defaultName, componentName]);
      for (const { local } of parseNamedImports(named ?? "")) renames.push([local, componentName]);
      return "";
    },
  );

  if (needed.size === 0) return null;

  // 2. Existing barrel imports are merged into a single one.
  const barrelImport = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*["']${escapeRegExp(BARREL)}["'];?[ \\t]*\\n?`,
    "g",
  );
  result = result.replace(barrelImport, (_match, named: string) => {
    for (const { imported, local } of parseNamedImports(named)) {
      needed.add(imported);
      renames.push([local, imported]);
    }
    return "";
  });

  for (const [from, to] of renames) result = renameIdentifier(result, from, to);

  // 3. Insert the barrel import after the last remaining import.
  const importLine = `import { ${[...needed].sort((a, b) => a.localeCompare(b)).join(", ")} } from "${BARREL}";`;
  const imports = [...result.matchAll(/^import[\s\S]*?;[ \t]*$/gm)];
  const last = imports.at(-1);
  if (last?.index === undefined) {
    result = `${importLine}\n${result}`;
  } else {
    const end = last.index + last[0].length;
    result = `${result.slice(0, end)}\n${importLine}${result.slice(end)}`;
  }
  return result.replace(/\n{3,}/g, "\n\n");
}

function migrateIcons(): void {
  const checkOnly = process.argv.includes("--check");
  const mappings = createMappings();
  const changed: string[] = [];

  for (const file of walk(WEB_SRC_DIR)) {
    if (file.startsWith(ICONS_DEST_DIR + sep)) continue;
    const next = migrateFile(readFileSync(file, "utf8"), mappings);
    if (next === null) continue;
    changed.push(relative(ROOT_DIR, file));
    if (!checkOnly) writeFileSync(file, next, "utf8");
  }

  if (changed.length > 0 && !checkOnly) {
    Bun.spawnSync(["bunx", "prettier", "--write", ...changed], { cwd: ROOT_DIR });
  }
  for (const file of changed) console.info(`${checkOnly ? "À migrer" : "Mis à jour"} : ${file}`);
  console.info(`${changed.length} fichier(s) ${checkOnly ? "à migrer" : "mis à jour"}.`);
  if (checkOnly && changed.length > 0) process.exit(1);
}

migrateIcons();
