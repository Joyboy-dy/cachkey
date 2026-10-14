import { expect, test } from "@playwright/test";
import {
  api,
  BASE_URL,
  createProject,
  linkFromEmail,
  newOwner,
  open,
  required,
  signUp,
  uniqueEmail,
} from "./helpers";

type Environment = { id: string; slug: string };

test("invitation d'un membre, accès en lecture limité à un environnement", async ({
  browser,
  page,
}) => {
  // Owner: a project with one variable in development and one in production.
  await newOwner(page, "access-owner");
  const slug = await createProject(page, `Projet partagé ${Date.now()}`);
  const environments = (await (
    await api(page).get(`/api/projects/${slug}/environments`)
  ).json()) as Environment[];
  const development = required(
    environments.find((environment) => environment.slug === "development"),
    "development",
  );
  for (const [env, key, value] of [
    ["development", "DEV_URL", "http://dev.example.com"],
    ["production", "PROD_SECRET", "ne-doit-pas-fuiter"],
  ]) {
    const response = await api(page).post(`/api/projects/${slug}/environments/${env}/secrets`, {
      data: { key, value },
    });
    expect(response.ok()).toBe(true);
  }

  // Invite a member by email.
  const memberEmail = uniqueEmail("access-member");
  const invited = await api(page).post("/api/auth/organization/invite-member", {
    data: { email: memberEmail, role: "member" },
    // Better Auth checks the origin of state-changing requests, as a browser sends it.
    headers: { origin: BASE_URL },
  });
  expect(invited.ok()).toBe(true);

  // The member creates an account and accepts from the email link.
  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  await signUp(member, "Sam Membre", memberEmail);
  await open(member, await linkFromEmail(memberEmail, "/invitation/"));
  await member.getByRole("button", { name: /^Rejoindre/ }).click();
  await expect(member).toHaveURL(/dashboard/);

  // Without access, the project does not exist for the member.
  expect((await api(member).get(`/api/projects/${slug}`)).status()).toBe(404);
  await open(member, "/projects");
  await expect(member.getByText(/Projet partagé/)).toHaveCount(0);

  // Owner grants read access to development only.
  const memberId = (
    (await (await api(member).get("/api/auth/get-session")).json()) as { user: { id: string } }
  ).user.id;
  const granted = await api(page).put(`/api/projects/${slug}/access/${memberId}`, {
    data: { level: "read", environmentIds: [development.id] },
  });
  expect(granted.ok()).toBe(true);

  // The member sees development and its value, not production, and cannot write.
  await open(member, `/projects/${slug}`);
  await expect(member.getByText("DEV_URL")).toBeVisible();
  await expect(member.getByRole("button", { name: "Ajouter une variable" })).toHaveCount(0);
  await expect(member.getByText("PROD_SECRET")).toHaveCount(0);

  const memberEnvironments = (await (
    await api(member).get(`/api/projects/${slug}/environments`)
  ).json()) as Environment[];
  expect(memberEnvironments.map((environment) => environment.slug)).toEqual(["development"]);

  const write = await api(member).post(`/api/projects/${slug}/environments/development/secrets`, {
    data: { key: "INTRUS", value: "x" },
  });
  expect(write.status()).toBe(403);
  const production = await api(member).post(`/api/projects/${slug}/environments/production/export`);
  expect([403, 404]).toContain(production.status());
  expect(await production.text()).not.toContain("ne-doit-pas-fuiter");

  // Management stays with owners and admins.
  expect((await api(member).get("/api/audit")).status()).toBe(403);
  expect((await api(member).get(`/api/projects/${slug}/tokens`)).status()).toBe(403);

  await memberContext.close();
});
