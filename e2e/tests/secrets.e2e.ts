import { expect, test } from "@playwright/test";
import { api, newOwner } from "./helpers";

test("projet, variable chiffrée, affichage, modification, historique et import", async ({
  page,
}) => {
  await newOwner(page, "secrets");

  // Project from the dialog: opens it on its first environment.
  // From the overview: the button opens the creation dialog directly.
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page.getByLabel("Nom du projet").fill("API de paiement");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page).toHaveURL(/\/projects\/api-de-paiement/);
  await page.waitForLoadState("networkidle");

  // Add a variable: the value is masked in the list.
  await page.getByRole("button", { name: "Ajouter une variable" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("STRIPE_KEY");
  await dialog.getByLabel("Valeur").fill("sk_test_premiere");
  await dialog.getByRole("button", { name: "Ajouter la variable" }).click();
  await expect(dialog).toBeHidden();
  const row = page
    .getByRole("row", { name: /STRIPE_KEY/ })
    .or(page.locator("li", { hasText: "STRIPE_KEY" }));
  await expect(row.first()).toBeVisible();
  await expect(page.getByText("sk_test_premiere")).toHaveCount(0);

  // Reveal on demand.
  await page.getByRole("button", { name: "Afficher STRIPE_KEY" }).first().click();
  await expect(page.getByText("sk_test_premiere")).toBeVisible();

  // Edit: a new version, the previous one stays in the history.
  await page.getByRole("button", { name: "Actions pour STRIPE_KEY" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await expect(dialog.getByLabel("Valeur")).toHaveValue("sk_test_premiere");
  await dialog.getByLabel("Valeur").fill("sk_test_seconde");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Actions pour STRIPE_KEY" }).click();
  await page.getByRole("menuitem", { name: "Historique" }).click();
  await expect(dialog.getByRole("heading", { name: "Historique" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Afficher la valeur/ })).toHaveCount(2);
  await page.keyboard.press("Escape");

  // Import a .env file: new keys created, existing ones kept.
  await page
    .getByRole("button", { name: /^Importer/ })
    .first()
    .click();
  await dialog
    .getByLabel("Contenu")
    .fill('STRIPE_KEY=ignoree\nDATABASE_URL="postgres://db/app"\nexport DEBUG=1\n');
  await dialog.getByRole("button", { name: /^Importer/ }).click();
  await expect(dialog.getByText("Import terminé : 2 ajoutées, 1 conservée.")).toBeVisible();
  await dialog.getByRole("button", { name: "Terminé" }).click();

  // What the server stores: values are right, STRIPE_KEY kept its edited value.
  const exported = await api(page).post(
    "/api/projects/api-de-paiement/environments/development/export",
  );
  const { content } = (await exported.json()) as { content: string };
  expect(content).toContain("STRIPE_KEY=sk_test_seconde");
  expect(content).toContain("DATABASE_URL=");
  expect(content).toContain("DEBUG=1");
});
