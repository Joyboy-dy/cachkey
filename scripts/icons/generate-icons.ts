/**
 * Generates typed React icon components from the SVG files in apps/web/public/icons.
 *
 *   bun run icons:generate
 *
 * - One component per SVG (`github.svg` → `GithubIcon`) in apps/web/src/components/icons,
 *   plus an `index.ts` barrel (`import { GithubIcon } from "@/components/icons"`).
 * - Monochrome icons inherit the text colour (`currentColor`); brand icons listed in
 *   PRESERVE_ORIGINAL_COLORS keep their colours.
 * - Internal SVG ids (gradients, clip paths…) are made unique per rendered instance
 *   with `useId`, so the same icon can appear several times on a page.
 * - Icons are decorative by default (`aria-hidden`) unless given an accessible name.
 * - Output is formatted with the repository's Prettier config. Stale generated
 *   components (SVG removed) are deleted.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { toComponentName } from "./icon-naming";
import { ICONS_DEST_DIR, ICONS_SRC_DIR, ROOT_DIR } from "./paths";

/** Brand marks whose official colours must be kept (e.g. the multicolour Google "G"). */
const PRESERVE_ORIGINAL_COLORS = new Set(["google.svg"]);
/** Hand-written components in ICONS_DEST_DIR that must never be deleted. */
const PROTECTED_CUSTOM_ICONS = new Set<string>();
const IGNORED_ICON_SOURCES = new Set(["favicon.svg"]);

const ATTRIBUTE_MAP: Record<string, string> = {
  class: "className",
  "xlink:href": "href",
  "xmlns:xlink": "xmlnsXlink",
  "xml:space": "xmlSpace",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-opacity": "strokeOpacity",
  "fill-rule": "fillRule",
  "fill-opacity": "fillOpacity",
  "clip-rule": "clipRule",
  "clip-path": "clipPath",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "flood-color": "floodColor",
  "flood-opacity": "floodOpacity",
  "color-interpolation-filters": "colorInterpolationFilters",
  "enable-background": "enableBackground",
  "baseline-shift": "baselineShift",
  "dominant-baseline": "dominantBaseline",
  "text-anchor": "textAnchor",
  "font-family": "fontFamily",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "letter-spacing": "letterSpacing",
  "word-spacing": "wordSpacing",
  "marker-start": "markerStart",
  "marker-mid": "markerMid",
  "marker-end": "markerEnd",
  "mask-type": "maskType",
  "shape-rendering": "shapeRendering",
  "image-rendering": "imageRendering",
  "paint-order": "paintOrder",
};

/** Attributes on the root <svg> that the component controls itself. */
const ROOT_ATTRIBUTES_TO_DROP = [
  "width",
  "height",
  "viewBox",
  "class",
  "className",
  "xmlns",
  // xlink:href is converted to href, so the namespace declaration is no longer needed.
  "xmlns:xlink",
  "xml:space",
];

function convertAttributesToReact(svgContent: string): string {
  // style="fill:#000;fill-opacity:1" → style={{"fill":"#000","fillOpacity":1}}
  let result = svgContent.replace(/style=(["'])(.*?)\1/g, (_match, _quote, styleText: string) => {
    const style: Record<string, string | number> = {};
    for (const rule of styleText.split(";")) {
      const [property, value] = rule.split(":").map((part) => part.trim());
      if (!property || !value) continue;
      const camelProperty = property.replace(/-([a-z])/g, (_m, letter: string) =>
        letter.toUpperCase(),
      );
      style[camelProperty] = Number.isNaN(Number(value)) ? value : Number(value);
    }
    return `style={${JSON.stringify(style)}}`;
  });

  for (const [from, to] of Object.entries(ATTRIBUTE_MAP)) {
    result = result.replace(new RegExp(`(?<=^|\\s)${from}\\s*=`, "g"), `${to}=`);
  }
  return result;
}

const COLOR_VALUE = String.raw`(#[0-9a-fA-F]{3,8}|black|white|rgb\([^)]+\)|rgba\([^)]+\))`;

function colorize(svgContent: string): string {
  let result = svgContent
    .replace(new RegExp(String.raw`\sfill=(["'])${COLOR_VALUE}\1`, "g"), ' fill="currentColor"')
    .replace(
      new RegExp(String.raw`\sstroke=(["'])${COLOR_VALUE}\1`, "g"),
      ' stroke="currentColor"',
    );

  if (!/\sfill=/.test(result) && /<path\b/.test(result)) {
    result = result.replace(/<path\b/g, '<path fill="currentColor"');
  }
  return result;
}

function getAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`));
  return match?.[1] ?? null;
}

function removeAttributes(attributes: string, names: string[]): string {
  let result = attributes;
  for (const name of names) {
    result = result.replace(new RegExp(`\\s*(?<![\\w:-])${name}\\s*=\\s*["'][^"']*["']`, "g"), "");
  }
  return result.trim();
}

/**
 * Rewrites every internal id (and its references) to `${uid}-<id>`, where `uid` comes from
 * React's `useId`. Returns the rewritten markup and whether any id was found.
 */
function scopeIds(svgContent: string): { content: string; hasIds: boolean } {
  const ids = [...svgContent.matchAll(/\sid=(["'])([^"']+)\1/g)].map((match) => match[2] ?? "");
  if (ids.length === 0) return { content: svgContent, hasIds: false };

  const idPattern = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const reference = new RegExp(`#(${idPattern})(?![\\w-])`, "g");
  // Non-global twin for .test(): a global regex keeps lastIndex between calls.
  const referencesId = new RegExp(`#(${idPattern})(?![\\w-])`);

  let content = svgContent.replace(
    /\sid=(["'])([^"']+)\1/g,
    (_match, _quote, id: string) => ` id={\`\${uid}-${id}\`}`,
  );
  // Any attribute value referencing an id: fill="url(#a)", href="#a", clipPath="url(#a)"…
  content = content.replace(
    /(\s[\w:-]+)=(["'])([^"']*#[^"']*)\2/g,
    (match, name: string, _q, value: string) =>
      referencesId.test(value)
        ? `${name}={\`${value.replace(reference, (_m, id: string) => `#\${uid}-${id}`)}\`}`
        : match,
  );
  return { content, hasIds: true };
}

function buildComponent(file: string, svgSource: string): { name: string; code: string } | null {
  const svg = svgSource
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const rootMatch = svg.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/);
  if (!rootMatch) {
    console.warn(`Impossible de lire le SVG : ${file}`);
    return null;
  }

  const preserveColors = PRESERVE_ORIGINAL_COLORS.has(file);
  const rootAttributes = rootMatch[1] ?? "";
  const viewBox = getAttribute(rootAttributes, "viewBox") ?? "0 0 24 24";

  let root = convertAttributesToReact(removeAttributes(rootAttributes, ROOT_ATTRIBUTES_TO_DROP));
  let inner = convertAttributesToReact((rootMatch[2] ?? "").trim());
  if (!preserveColors) {
    root = colorize(root);
    inner = colorize(inner);
  }
  const scoped = scopeIds(inner);

  const name = toComponentName(file);
  const source = relative(ROOT_DIR, join(ICONS_SRC_DIR, file)).replaceAll("\\", "/");
  const reactImports = scoped.hasIds ? "type SVGProps, useId" : "type SVGProps";
  const uidLine = scoped.hasIds
    ? `  // Unique per instance so several icons on one page do not share gradient/clip ids.\n  const uid = useId().replace(/[^\\w-]/g, "");\n`
    : "";

  const code = `// Generated by scripts/icons/generate-icons.ts from ${source} — do not edit by hand.
import { ${reactImports} } from "react";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & {
  /** Width and height; defaults to 1em (inherits the font size). */
  size?: number | string;
};

export function ${name}({ size, width, height, className, ...props }: IconProps) {
${uidLine}  const labelled = Boolean(props["aria-label"] ?? props["aria-labelledby"]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width={size ?? width ?? "1em"}
      height={size ?? height ?? "1em"}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", className)}
      ${root}
      {...props}
    >
      ${scoped.content}
    </svg>
  );
}
`;
  return { name, code };
}

function generateIcons(): void {
  if (!existsSync(ICONS_SRC_DIR)) {
    console.error(`Dossier source introuvable : ${ICONS_SRC_DIR}`);
    process.exit(1);
  }
  mkdirSync(ICONS_DEST_DIR, { recursive: true });

  const files = readdirSync(ICONS_SRC_DIR)
    .filter((file) => file.endsWith(".svg") && !IGNORED_ICON_SOURCES.has(file))
    .sort((a, b) => a.localeCompare(b));
  console.info(`${files.length} icône(s) SVG trouvée(s) dans ${relative(ROOT_DIR, ICONS_SRC_DIR)}`);

  const generated = new Map<string, string>(); // component name → file name
  for (const file of files) {
    const component = buildComponent(file, readFileSync(join(ICONS_SRC_DIR, file), "utf8"));
    if (!component) continue;
    if (generated.has(component.name)) {
      console.error(
        `Nom en double : ${component.name} (${file} et ${generated.get(component.name)})`,
      );
      process.exit(1);
    }
    writeFileSync(join(ICONS_DEST_DIR, `${component.name}.tsx`), component.code, "utf8");
    generated.set(component.name, file);
    console.info(`Généré : ${component.name}.tsx`);
  }

  // Remove components whose SVG source disappeared.
  for (const file of readdirSync(ICONS_DEST_DIR)) {
    const isGenerated = /^[A-Z]\w*Icon\.tsx$/.test(file);
    if (
      isGenerated &&
      !generated.has(file.replace(/\.tsx$/, "")) &&
      !PROTECTED_CUSTOM_ICONS.has(file)
    ) {
      unlinkSync(join(ICONS_DEST_DIR, file));
      console.info(`Supprimé : ${file}`);
    }
  }

  const exports = [
    ...generated.keys(),
    ...[...PROTECTED_CUSTOM_ICONS].map((f) => f.replace(/\.tsx$/, "")),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `export { ${name} } from "./${name}";`);
  writeFileSync(
    join(ICONS_DEST_DIR, "index.ts"),
    `// Generated by scripts/icons/generate-icons.ts — do not edit by hand.\n${exports.join("\n")}\n`,
    "utf8",
  );
  console.info(`index.ts : ${exports.length} export(s).`);

  const prettier = Bun.spawnSync(["bunx", "prettier", "--write", ICONS_DEST_DIR], {
    cwd: ROOT_DIR,
  });
  if (prettier.exitCode !== 0) {
    console.error(prettier.stderr.toString());
    process.exit(1);
  }
}

generateIcons();
