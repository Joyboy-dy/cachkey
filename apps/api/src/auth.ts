import {
  renderConfirmEmailChange,
  renderDeleteAccount,
  renderPasswordChanged,
  renderResetPassword,
  renderVerifyEmail,
} from "@cachkey/emails";
import {
  avatarSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type SocialProviderId,
} from "@cachkey/shared";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";

const ONE_HOUR = 60 * 60;

type SocialProviders = NonNullable<BetterAuthOptions["socialProviders"]>;

/** OAuth providers are enabled only when their credentials are configured. */
function configureSocialProviders(): SocialProviders {
  const providers: SocialProviders = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

const socialProviders = configureSocialProviders();

export const enabledSocialProviders = Object.keys(socialProviders) as SocialProviderId[];

export const auth = betterAuth({
  appName: "Cachkey",
  baseURL: env.APP_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    resetPasswordTokenExpiresIn: ONE_HOUR,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        await renderResetPassword({ appUrl: env.APP_URL, name: user.name, resetUrl: url }),
      );
    },
    onPasswordReset: async ({ user }) => {
      await sendEmail(
        user.email,
        await renderPasswordChanged({ appUrl: env.APP_URL, name: user.name }),
      );
    },
  },

  user: {
    additionalFields: {
      // Seed of the DiceBear « Clay » avatar, rendered by the web app.
      avatarSeed: {
        type: "string",
        required: false,
        input: true,
        validator: { input: avatarSchema.shape.avatarSeed },
      },
    },
    changeEmail: {
      enabled: true,
      // Verified accounts: the current address confirms first, then the new one is verified.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmail(
          user.email,
          await renderConfirmEmailChange({
            appUrl: env.APP_URL,
            name: user.name,
            newEmail,
            confirmUrl: url,
          }),
        );
      },
    },
    deleteUser: {
      enabled: true,
      deleteTokenExpiresIn: ONE_HOUR,
      // Deletion always goes through a link sent by email (works for OAuth-only accounts too).
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendEmail(
          user.email,
          await renderDeleteAccount({ appUrl: env.APP_URL, name: user.name, deleteUrl: url }),
        );
      },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // Re-send the link when an unverified user tries to sign in.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: ONE_HOUR,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        user.email,
        await renderVerifyEmail({ appUrl: env.APP_URL, name: user.name, verificationUrl: url }),
      );
    },
  },

  socialProviders,

  account: {
    accountLinking: {
      enabled: true,
      // Google and GitHub verify email ownership, so linking by email is safe.
      trustedProviders: ["google", "github"],
      // Linking from the account page may use a provider address different from the account's.
      allowDifferentEmails: true,
    },
  },

  session: {
    expiresIn: 7 * 24 * ONE_HOUR,
    updateAge: 24 * ONE_HOUR,
  },

  // Persisted in PostgreSQL so limits survive restarts and are shared between instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/change-password": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 3 },
      "/delete-user": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },

  hooks: {
    // Notify the owner whenever their password changes from the account settings.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password") return;
      const user = (ctx.context.newSession ?? ctx.context.session)?.user;
      if (!user || ctx.context.returned instanceof Error) return;
      await sendEmail(
        user.email,
        await renderPasswordChanged({ appUrl: env.APP_URL, name: user.name, reason: "changed" }),
      );
    }),
  },

  advanced: {
    useSecureCookies: env.APP_URL.startsWith("https://"),
  },
});
