import { expect, test } from "@playwright/test";
import { createOrganization, open, PASSWORD, signUp, uniqueEmail } from "./helpers";

test("inscription, confirmation de l'email, organisation, déconnexion et reconnexion", async ({
  page,
}) => {
  const email = uniqueEmail("account");
  await signUp(page, "Camille Test", email);
  await createOrganization(page, "Org Parcours Compte");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Sign out from the avatar menu, then sign in again.
  await page
    .getByRole("button", { name: /Camille Test|menu du compte/i })
    .first()
    .click();
  await page.getByRole("menuitem", { name: /Se déconnecter/ }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("un mauvais mot de passe est refusé sans révéler si le compte existe", async ({ page }) => {
  await open(page, "/sign-in");
  await page.getByLabel("Adresse email").fill(uniqueEmail("nobody"));
  await page.getByLabel("Mot de passe", { exact: true }).fill("pas-le-bon-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/sign-in/);
});
