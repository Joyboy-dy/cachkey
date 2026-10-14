import { basename } from "node:path";

function toPascalCase(value: string): string {
  return value
    .replace(/\.svg$/i, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, character: string) => character.toUpperCase())
    .replace(/^(.)/, (_match, character: string) => character.toUpperCase());
}

/** `github.svg` → `GithubIcon`, `arrow-left-icon.svg` → `ArrowLeftIcon`. */
export function toComponentName(fileName: string): string {
  const pascalName = toPascalCase(basename(fileName, ".svg"));
  return pascalName.endsWith("Icon") ? pascalName : `${pascalName}Icon`;
}
