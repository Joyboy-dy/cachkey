import { z } from "zod";

const optional = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3001),
    /** Public origin of the web app. Better Auth is served behind it at /api/auth. */
    APP_URL: z.url(),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must contain at least 32 characters."),
    /** Master key of the secrets envelope encryption: 32 bytes, base64-encoded. */
    ENCRYPTION_KEY: z
      .string()
      .trim()
      .refine(
        (value) => Buffer.from(value, "base64").length === 32,
        "ENCRYPTION_KEY must be 32 random bytes encoded in base64 (openssl rand -base64 32).",
      ),

    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    GITHUB_CLIENT_ID: optional,
    GITHUB_CLIENT_SECRET: optional,

    EMAIL_PROVIDER: z.enum(["smtp", "resend"]).default("smtp"),
    EMAIL_FROM: z.string().min(1).default("Cachkey <no-reply@cachkey.local>"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1026),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    RESEND_API_KEY: optional,
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend.",
      });
    }
    for (const provider of ["GOOGLE", "GITHUB"] as const) {
      const hasId = Boolean(env[`${provider}_CLIENT_ID`]);
      const hasSecret = Boolean(env[`${provider}_CLIENT_SECRET`]);
      if (hasId !== hasSecret) {
        ctx.addIssue({
          code: "custom",
          path: [`${provider}_CLIENT_ID`],
          message: `${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET must be set together.`,
        });
      }
    }
  });

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment configuration:\n" + z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
