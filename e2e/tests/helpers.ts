import { type APIRequestContext, expect, type Page, request } from "@playwright/test";

/*
 * Shared steps. Accounts are created through the real flow (sign-up + email link from
 * Mailpit) so every test starts from a verified user with an organisation.
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8026";
export const PASSWORD = "Motdepasse-e2e-solide-42";

/** Narrows a value the test expects to exist, failing with a readable message otherwise. */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`Introuvable : ${what}`);
  return value;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

type MailpitMessage = { ID: string; To: { Address: string }[]; Subject: string };

/** First link of the latest email sent to `to` whose URL contains `fragment`. */
export async function linkFromEmail(to: string, fragment: string): Promise<string> {
  const api = await request.newContext();
  try {
    let found: string | null = null;
    await expect
      .poll(
        async () => {
          const list = await api.get(
            `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
          );
          const { messages } = (await list.json()) as { messages: MailpitMessage[] };
          for (const message of messages) {
            const html = await (
              await api.get(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
            ).json();
            const body = `${html.HTML ?? ""} ${html.Text ?? ""}`;
            const match = new RegExp(`https?://[^"'\\s<>]*${fragment}[^"'\\s<>]*`).exec(body);
            if (match) {
              found = match[0].replaceAll("&amp;", "&");
              return true;
            }
          }
          return false;
        },
        { timeout: 15_000, message: `email with « ${fragment} » to ${to}` },
      )
      .toBe(true);
    return found as unknown as string;
  } finally {
    await api.dispose();
  }
}

/** Navigates and waits until the page is interactive (hydrated: no request in flight). */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Signs up through the form, follows the verification email and lands signed in. */
export async function signUp(page: Page, name: string, email: string): Promise<void> {
  await open(page, "/sign-up");
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/check-email/);
  await open(page, await linkFromEmail(email, "verify-email"));
  await page.getByRole("link", { name: "Continuer" }).click();
}

/** From the onboarding page: creates the user's first organisation. */
export async function createOrganization(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL(/onboarding/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Nom de l.organisation/).fill(name);
  await page.getByRole("button", { name: /Créer/ }).click();
  await expect(page).toHaveURL(/dashboard|welcome/);
  await page.waitForLoadState("networkidle");
}

/** A new verified user with an organisation, signed in on `page`. */
export async function newOwner(page: Page, label = "owner") {
  const email = uniqueEmail(label);
  await signUp(page, "Alex Propriétaire", email);
  await createOrganization(page, `Org ${label} ${Date.now()}`);
  return { email };
}

/** API calls with the cookies of `page` (same origin as the web app). */
export function api(page: Page): APIRequestContext {
  return page.request;
}

export async function createProject(page: Page, name: string): Promise<string> {
  const response = await api(page).post("/api/projects", { data: { name, description: "" } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { slug: string }).slug;
}
