-- Projects created before environments existed get the default ones.
INSERT INTO "environments" ("id", "project_id", "name", "slug", "position", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", d."name", d."slug", d."position", now(), now()
FROM "projects" p
CROSS JOIN (VALUES
  ('Développement', 'development', 0),
  ('Préproduction', 'staging', 1),
  ('Production', 'production', 2)
) AS d("name", "slug", "position")
WHERE NOT EXISTS (SELECT 1 FROM "environments" e WHERE e."project_id" = p."id");
