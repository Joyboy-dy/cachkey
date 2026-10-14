import { SECRET_KEY_PATTERN } from "./secret-schemas";

/*
 * Reading and writing `.env` files, compatible with dotenv:
 * `KEY=value`, optional `export ` prefix, `#` comments, single quotes (literal),
 * double quotes (with \n, \r, \t, \", \\ escapes, may span several lines) and backticks.
 */

export type DotenvEntry = { key: string; value: string };
export type DotenvParseResult = {
  /** In file order; a key defined twice keeps its last value, at its first position. */
  entries: DotenvEntry[];
  /** 1-based line numbers that are neither blank, comments nor valid assignments. */
  invalidLines: number[];
};

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };

function unescapeDouble(raw: string): string {
  return raw.replace(/\\([nrt"\\])/g, (_, char: string) => ESCAPES[char] ?? char);
}

export function parseDotenv(content: string): DotenvParseResult {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const values = new Map<string, string>();
  const invalidLines: number[] = [];

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = (lines[index] ?? "").trim();
    if (line === "" || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([^=\s]+)\s*=\s*(.*)$/.exec(line);
    const key = match?.[1];
    if (!match || !key || !SECRET_KEY_PATTERN.test(key)) {
      invalidLines.push(lineNumber);
      continue;
    }

    let rest = match[2] ?? "";
    const quote = rest[0];
    let value: string;

    if (quote === '"' || quote === "'" || quote === "`") {
      // The value may continue on the next lines until the closing quote.
      let body = rest.slice(1);
      let closing = findClosingQuote(body, quote);
      let lastLine = index;
      while (closing === -1 && lastLine + 1 < lines.length) {
        lastLine++;
        body += `\n${lines[lastLine] ?? ""}`;
        closing = findClosingQuote(body, quote);
      }
      if (closing === -1) {
        invalidLines.push(lineNumber);
        continue;
      }
      index = lastLine;
      const inner = body.slice(0, closing);
      value = quote === '"' ? unescapeDouble(inner) : inner;
      rest = body.slice(closing + 1).trim();
      if (rest !== "" && !rest.startsWith("#")) {
        invalidLines.push(lineNumber);
        continue;
      }
    } else {
      // Unquoted: an inline comment starts at « #» preceded by whitespace.
      value = rest.replace(/\s+#.*$/, "").trim();
    }

    values.delete(key);
    values.set(key, value);
  }

  return {
    entries: [...values].map(([key, value]) => ({ key, value })),
    invalidLines,
  };
}

function findClosingQuote(body: string, quote: string): number {
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quote === '"' && char === "\\") {
      i++;
      continue;
    }
    if (char === quote) return i;
  }
  return -1;
}

/** Plain values stay bare; anything else is double-quoted with escapes. */
export function serializeDotenvValue(value: string): string {
  if (/^[A-Za-z0-9_\-.,:/@+%=?&*~^!$]*$/.test(value)) return value;
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

export function serializeDotenv(entries: readonly DotenvEntry[], header?: string): string {
  const lines = entries.map(({ key, value }) => `${key}=${serializeDotenvValue(value)}`);
  const head = header
    ? header
        .split("\n")
        .map((line) => `# ${line}`.trimEnd())
        .join("\n") + "\n"
    : "";
  return `${head}${lines.join("\n")}\n`;
}
