-- Bricks: independent parts of a project, each with its own variables.
-- Every project gets a « main » brick, which takes all existing variables and tokens, and a
-- hidden « shared » brick (variables inherited by every brick).

-- CreateTable
CREATE TABLE "bricks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'custom',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bricks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bricks_project_id_slug_key" ON "bricks"("project_id", "slug");

-- AddForeignKey
ALTER TABLE "bricks" ADD CONSTRAINT "bricks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Main and shared bricks of the existing projects.
INSERT INTO "bricks" ("id", "project_id", "name", "slug", "kind", "position", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", b."name", b."slug", b."kind", b."position", now(), now()
FROM "projects" p
CROSS JOIN (VALUES
  ('Principale', 'principale', 'main', 0),
  ('Partagées', 'shared', 'shared', 0)
) AS b("name", "slug", "kind", "position");

-- Existing variables and tokens belong to the main brick.
ALTER TABLE "secrets" ADD COLUMN "brick_id" TEXT;
UPDATE "secrets" s SET "brick_id" = b."id"
FROM "environments" e, "bricks" b
WHERE e."id" = s."environment_id" AND b."project_id" = e."project_id" AND b."kind" = 'main';
ALTER TABLE "secrets" ALTER COLUMN "brick_id" SET NOT NULL;

ALTER TABLE "service_tokens" ADD COLUMN "brick_id" TEXT;
UPDATE "service_tokens" t SET "brick_id" = b."id"
FROM "bricks" b
WHERE b."project_id" = t."project_id" AND b."kind" = 'main';
ALTER TABLE "service_tokens" ALTER COLUMN "brick_id" SET NOT NULL;

-- A name is unique per environment and brick.
DROP INDEX "secrets_environment_id_key_key";
CREATE UNIQUE INDEX "secrets_environment_id_brick_id_key_key" ON "secrets"("environment_id", "brick_id", "key");
CREATE INDEX "secrets_brick_id_idx" ON "secrets"("brick_id");

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_brick_id_fkey" FOREIGN KEY ("brick_id") REFERENCES "bricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_tokens" ADD CONSTRAINT "service_tokens_brick_id_fkey" FOREIGN KEY ("brick_id") REFERENCES "bricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN "brick_name" TEXT;
