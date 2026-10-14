import { defineConfig } from "prisma/config";

// DATABASE_URL comes from the repository root `.env.local` (loaded by the package scripts).
// It may be absent for `prisma generate`, which does not connect to the database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
