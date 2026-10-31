import { createInterface } from "node:readline/promises";

/*
 * Small terminal helpers: questions, numbered choices, masked input, opening a URL.
 * Prompts go to stderr so that stdout stays clean for pipes (`cachkey get X | pbcopy`).
 */

export class CliError extends Error {}

export const interactive = Boolean(process.stdin.isTTY && process.stderr.isTTY);

export function info(message: string): void {
  process.stderr.write(`${message}\n`);
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export async function confirm(question: string): Promise<boolean> {
  if (!interactive) throw new CliError("Confirmation impossible sans terminal : ajoutez --yes.");
  const answer = await ask(`${question} (o/N) `);
  return /^(o|oui|y|yes)$/i.test(answer);
}

/** Numbered list; returns the chosen item. A single item is chosen without asking. */
export async function choose<T>(title: string, items: T[], label: (item: T) => string): Promise<T> {
  if (items.length === 1 && items[0] !== undefined) {
    info(`${title} : ${label(items[0])}`);
    return items[0];
  }
  if (!interactive) throw new CliError(`${title} : précisez-le avec l'option correspondante.`);
  info(`${title} :`);
  items.forEach((item, index) => info(`  ${String(index + 1).padStart(2)}. ${label(item)}`));
  for (;;) {
    const answer = Number(await ask(`Votre choix (1-${items.length}) : `));
    const item = items[answer - 1];
    if (Number.isInteger(answer) && item !== undefined) return item;
    info("Choix invalide.");
  }
}

/** Reads a value without echoing it (TTY), or the whole of stdin when piped. */
export async function readSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return (await new Response(Bun.stdin.stream()).text()).replace(/\r?\n$/, "");
  }
  process.stderr.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const done = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      process.stderr.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return done();
        if (char === "\u0003") return done(new CliError("Annulé."));
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

/**
 * Listens to single key presses (TTY) while something else runs; returns a function that
 * stops listening. Ctrl+C still quits.
 */
export function onKeys(handlers: Record<string, () => void>): () => void {
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let listening = true;
  const stop = () => {
    if (!listening) return;
    listening = false;
    stdin.off("data", onData);
    stdin.setRawMode(false);
    stdin.pause();
  };
  const onData = (chunk: string) => {
    for (const char of chunk) {
      if (char === "\u0003") {
        stop();
        info("\nAnnulé.");
        process.exit(130);
      }
      handlers[char === "\n" ? "\r" : char.toLowerCase()]?.();
    }
  };
  stdin.on("data", onData);
  return stop;
}

/** Copies text to the system clipboard; false when no clipboard tool is available. */
export async function copyToClipboard(text: string): Promise<boolean> {
  const commands =
    process.platform === "win32"
      ? [["clip"]]
      : process.platform === "darwin"
        ? [["pbcopy"]]
        : [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]];
  for (const command of commands) {
    try {
      const child = Bun.spawn(command, { stdin: "pipe", stdout: "ignore", stderr: "ignore" });
      void child.stdin.write(text);
      await child.stdin.end();
      if ((await child.exited) === 0) return true;
    } catch {
      // Tool not installed: try the next one.
    }
  }
  return false;
}

/** Opens a URL in the default browser; false when it could not be done. */
export function openBrowser(url: string): boolean {
  const command =
    process.platform === "win32"
      ? ["rundll32", "url.dll,FileProtocolHandler", url]
      : process.platform === "darwin"
        ? ["open", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(command, { stdio: ["ignore", "ignore", "ignore"] }).unref();
    return true;
  } catch {
    return false;
  }
}
