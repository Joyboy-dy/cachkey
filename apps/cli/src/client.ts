import { hostname } from "node:os";
import packageJson from "../package.json";
import { CliError } from "./terminal";

/*
 * HTTP client of the CLI. Two kinds of credentials, both sent as `Authorization: Bearer`:
 * - the session from `cachkey login` (same rights as the user, all API routes);
 * - a service token `ck_…` (read-only, one environment, public API /api/v1 only).
 *
 * The user agent names the CLI and the machine: the web app shows it in « Appareils » and
 * the activity log marks actions made from the terminal.
 */

export const USER_AGENT = `cachkey-cli/${packageJson.version} (${hostname()})`;

/** Organisation of the request for session calls (the server still checks membership). */
const ORGANIZATION_HEADER = "x-cachkey-organization";

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Session expirée ou révoquée. Reconnectez-vous avec « cachkey login ».",
  INVALID_TOKEN: "Jeton refusé : il est invalide, expiré ou a été révoqué.",
  FORBIDDEN: "Vous n'avez pas les droits nécessaires pour cette action.",
  PROJECT_NOT_FOUND: "Projet introuvable, ou vous n'y avez pas accès.",
  ENVIRONMENT_NOT_FOUND: "Environnement introuvable, ou vous n'y avez pas accès.",
  SECRET_NOT_FOUND: "Cette variable n'existe pas.",
  SECRET_ALREADY_EXISTS: "Une variable porte déjà ce nom.",
  TOO_MANY_SECRETS: "Cet environnement a atteint le nombre maximal de variables.",
  VALIDATION_ERROR: "Valeur refusée : vérifiez le nom (lettres, chiffres, _) et la valeur.",
  NO_ACTIVE_ORGANIZATION: "Aucune organisation : créez-en une depuis l'application web.",
};

export class Api {
  constructor(
    readonly baseUrl: string,
    private readonly bearer: string | null,
    private readonly organizationId: string | null = null,
  ) {}

  withOrganization(organizationId: string): Api {
    return new Api(this.baseUrl, this.bearer, organizationId);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { "user-agent": USER_AGENT };
    if (this.bearer) headers.authorization = `Bearer ${this.bearer}`;
    if (this.organizationId) headers[ORGANIZATION_HEADER] = this.organizationId;
    if (body !== undefined) headers["content-type"] = "application/json";
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new CliError(
        `Impossible de joindre ${this.baseUrl}. Vérifiez l'adresse (--url ou CACHKEY_URL).`,
      );
    }
    const text = await response.text();
    const data: unknown = text ? safeJson(text) : null;
    if (!response.ok) throw new ApiError(response.status, data);
    return data as T;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ApiError extends CliError {
  readonly code: string | null;
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const code =
      typeof record.code === "string"
        ? record.code
        : typeof record.error === "string"
          ? record.error
          : null;
    super(
      (code && MESSAGES[code]) ??
        (status === 401 ? MESSAGES.UNAUTHORIZED : undefined) ??
        `Le serveur a répondu par une erreur (${status}).`,
    );
    this.code = code;
  }
}
