/*
 * Command-line parsing, kept free of I/O so it can be tested.
 */

export type Format = "dotenv" | "json";

export type Options = {
  token: string | null;
  url: string | null;
  org: string | null;
  project: string | null;
  env: string | null;
  format: Format;
  output: string | null;
  yes: boolean;
  overwrite: boolean;
  noBrowser: boolean;
  all: boolean;
};

export type Command =
  | { name: "help" }
  | { name: "version" }
  | { name: "login" }
  | { name: "logout" }
  | { name: "whoami" }
  | { name: "init"; projectName: string | null }
  | { name: "link" }
  | { name: "unlink" }
  | { name: "orgs" }
  | { name: "projects" }
  | { name: "project-create"; projectName: string }
  | { name: "envs" }
  | { name: "env-create"; envName: string }
  | { name: "secrets" }
  | { name: "get"; key: string }
  | { name: "set"; key: string; value: string | null }
  | { name: "rm"; key: string }
  | { name: "import"; file: string }
  | { name: "pull" }
  | { name: "run"; command: string[] };

export type Parsed = { command: Command; options: Options } | { error: string };

export const DEFAULT_URL = "http://localhost:3000";

export const HELP = `Cachkey — vos variables d'environnement depuis le terminal.

Connexion
  cachkey login                 Connecte ce terminal à votre compte (via le navigateur).
  cachkey logout                Déconnecte ce terminal.
  cachkey whoami                Compte, organisation, projet et environnement utilisés.

Projets
  cachkey init [nom]            Crée un projet (nom du dossier par défaut) et y lie ce dossier.
  cachkey link                  Lie ce dossier à un projet existant et un environnement.
  cachkey unlink                Retire ce lien.
  cachkey projects [create <nom>]       Liste ou crée des projets.
  cachkey envs [create <nom>]           Liste ou crée des environnements.
  cachkey orgs                  Liste vos organisations.

Variables
  cachkey secrets               Liste les variables (sans leurs valeurs).
  cachkey get <NOM>             Affiche une valeur.
  cachkey set <NOM> [valeur]    Ajoute ou modifie (sans valeur : lue au clavier, masquée).
  cachkey rm <NOM>              Supprime une variable (demande confirmation).
  cachkey import <fichier>      Importe un fichier .env (--overwrite pour remplacer).

Utiliser
  cachkey pull                  Écrit .env.<environnement> à la racine du projet.
      --env a,b | --all         Plusieurs environnements : un fichier chacun.
      --output <fichier>        Autre fichier (« - » : affiche dans le terminal).
      --format json             JSON au lieu du format .env.
  cachkey run -- <commande> [arguments]   Lance la commande avec les variables.

Options
  --org, --project, --env <identifiant>   Remplacent ceux du dossier lié.
  --all               Tous les environnements (pull).
  --url <adresse>     Instance Cachkey (sinon CACHKEY_URL, puis celle de la connexion).
  --token <jeton>     Jeton d'accès d'un serveur ou d'une CI (sinon CACHKEY_TOKEN).
  --yes, -y           Ne demande pas de confirmation.
  --no-browser        N'ouvre pas le navigateur lors de la connexion.
  -h, --help · -v, --version

Sur un serveur ou en CI, utilisez un jeton d'accès (CACHKEY_TOKEN) : pull, run et whoami
fonctionnent alors sans connexion.`;

const VALUE_FLAGS = {
  "--token": "token",
  "--url": "url",
  "--org": "org",
  "--project": "project",
  "--env": "env",
  "--output": "output",
  "-o": "output",
  "--format": "format",
} as const;

const SIMPLE = ["login", "logout", "whoami", "link", "unlink", "orgs", "secrets", "pull"] as const;

export function parseArgs(argv: readonly string[]): Parsed {
  const options: Options = {
    token: null,
    url: null,
    org: null,
    project: null,
    env: null,
    format: "dotenv",
    output: null,
    yes: false,
    overwrite: false,
    noBrowser: false,
    all: false,
  };
  const positional: string[] = [];
  let rest: string[] | null = null;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] ?? "";
    if (arg === "--") {
      rest = argv.slice(index + 1);
      break;
    }
    if (arg === "-h" || arg === "--help") return { command: { name: "help" }, options };
    if (arg === "-v" || arg === "--version") return { command: { name: "version" }, options };
    if (arg === "-y" || arg === "--yes") {
      options.yes = true;
      continue;
    }
    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }
    if (arg === "--no-browser") {
      options.noBrowser = true;
      continue;
    }
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") {
      const equals = arg.indexOf("=");
      const flag = equals === -1 ? arg : arg.slice(0, equals);
      if (!(flag in VALUE_FLAGS)) return { error: `Option inconnue : ${flag}.` };
      const value = equals === -1 ? argv[++index] : arg.slice(equals + 1);
      if (value === undefined || value === "") return { error: `Valeur manquante pour ${flag}.` };
      const target = VALUE_FLAGS[flag as keyof typeof VALUE_FLAGS];
      if (target === "format") {
        if (value !== "dotenv" && value !== "json") {
          return { error: "Le format doit être « dotenv » ou « json »." };
        }
        options.format = value;
      } else {
        options[target] = value;
      }
      continue;
    }
    positional.push(arg);
  }

  const [name, ...args] = positional;
  const command = toCommand(name, args, rest);
  return "error" in command ? command : { command, options };
}

function toCommand(
  name: string | undefined,
  args: string[],
  rest: string[] | null,
): Command | { error: string } {
  if (rest !== null && name !== "run") return { error: "« -- » n'est utile qu'avec « run »." };
  const extra = (allowed: number) =>
    args.length > allowed ? { error: `Argument inattendu : ${args[allowed]}.` } : null;
  const missing = (what: string) => ({ error: `Indiquez ${what} : cachkey ${name} <${what}>.` });

  switch (name) {
    case undefined:
      return { name: "help" };
    case "run":
      if (!rest || rest.length === 0) {
        return { error: "Indiquez la commande à lancer : cachkey run -- <commande>." };
      }
      return extra(0) ?? { name: "run", command: rest };
    case "get":
    case "rm":
      if (!args[0]) return missing("NOM");
      return extra(1) ?? { name, key: args[0] };
    case "set":
      if (!args[0]) return missing("NOM");
      return extra(2) ?? { name: "set", key: args[0], value: args[1] ?? null };
    case "init":
      return extra(1) ?? { name: "init", projectName: args[0] ?? null };
    case "projects":
    case "envs":
      if (args[0] === undefined) return { name };
      if (args[0] !== "create")
        return { error: `Sous-commande inconnue : ${args[0]}. Essayez « ${name} create <nom> ».` };
      if (!args[1]) return { error: `Indiquez le nom : cachkey ${name} create <nom>.` };
      if (args.length > 2)
        return { error: `Mettez le nom entre guillemets s'il contient des espaces.` };
      return name === "projects"
        ? { name: "project-create", projectName: args[1] }
        : { name: "env-create", envName: args[1] };
    case "import":
      if (!args[0]) return missing("fichier");
      return extra(1) ?? { name: "import", file: args[0] };
    default:
      if ((SIMPLE as readonly string[]).includes(name)) {
        return extra(0) ?? ({ name } as Command);
      }
      return { error: `Commande inconnue : ${name}. Lancez « cachkey --help ».` };
  }
}

/** Base URL without trailing slash: option, then environment, then saved login, then default. */
export function resolveUrl(
  option: string | null,
  env: Record<string, string | undefined>,
  saved?: string | null,
): string {
  return (option ?? env.CACHKEY_URL ?? saved ?? DEFAULT_URL).replace(/\/+$/, "");
}

/** « WDJBMJHT » → « WDJB-MJHT ». */
export function formatUserCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
