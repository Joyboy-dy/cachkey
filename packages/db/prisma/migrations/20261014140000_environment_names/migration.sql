-- Default environments use the names developers type every day.
UPDATE "environments" SET "name" = "slug"
WHERE ("slug", "name") IN (('development', 'Développement'), ('staging', 'Préproduction'), ('production', 'Production'));
