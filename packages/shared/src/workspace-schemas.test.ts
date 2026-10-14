import { describe, expect, test } from "bun:test";
import { canManage, projectSchema, slugify } from "./workspace-schemas";

describe("slugify", () => {
  test("produces URL-safe identifiers", () => {
    expect(slugify("Mon Projet")).toBe("mon-projet");
    expect(slugify("  Économie & Café — v2 ")).toBe("economie-cafe-v2");
    expect(slugify("API_Paiements")).toBe("api-paiements");
  });

  test("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
  });

  test("caps the length without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(47)} b`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("projectSchema", () => {
  test("rejects names without letters or digits", () => {
    expect(projectSchema.safeParse({ name: "!!", description: "" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "Site web", description: "" }).success).toBe(true);
  });
});

describe("canManage", () => {
  test("only owners and admins manage", () => {
    expect(canManage("owner")).toBe(true);
    expect(canManage("admin")).toBe(true);
    expect(canManage("member")).toBe(false);
    expect(canManage(undefined)).toBe(false);
  });
});
