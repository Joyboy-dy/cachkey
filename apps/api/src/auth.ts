import {
  renderConfirmEmailChange,
  renderDeleteAccount,
  renderPasswordChanged,
  renderResetPassword,
  renderTwoFactorChanged,
  renderVerifyEmail,
} from "@cachkey/emails";
import {
  avatarSchema,
  isReadableText,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type SocialProviderId,
} from "@cachkey/shared";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { bearer, deviceAuthorization, organization, twoFactor } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";
import { afterMembershipChange, organizationHooks, sendInvitation } from "./organization-events";
import { twoFactorIssuer } from "./two-factor-issuer";

const ONE_HOUR = 60 * 60;

/** The only device-flow client: Cachkey's own command-line tool. */
export const CLI_CLIENT_ID = "cachkey-cli";

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
      // The twoFactor plugin already limits /two-factor/* (3 requests per 10 seconds) and
      // locks an account for 15 minutes after 10 wrong codes in a row.
    },
  },

  plugins: [
    // Second factor at email + password sign-in: authenticator app (TOTP) and single-use
    // backup codes, both encrypted with BETTER_AUTH_SECRET. Enabling, disabling and new
    // backup codes need the password. Google / GitHub sign-ins rely on the provider's own
    // protection; `cachkey login` is approved from a browser session, so it inherits 2FA.
    twoFactor({
      issuer: twoFactorIssuer(env.APP_URL, env.NODE_ENV),
      trustDeviceMaxAge: 30 * 24 * ONE_HOUR,
    }),
    // `cachkey login`: the CLI shows a code, the user approves it on /device, the CLI receives
    // a session of its own (sent as a Bearer token, revocable from « Appareils connectés »).
    deviceAuthorization({
      verificationUri: "/device",
      expiresIn: "10m",
      interval: "5s",
      validateClient: (clientId) => clientId === CLI_CLIENT_ID,
    }),
    // Lets that session authenticate with `Authorization: Bearer` instead of a cookie.
    bearer(),
    organization({
      creatorRole: "owner",
      organizationLimit: 20,
      membershipLimit: 100,
      invitationExpiresIn: 7 * 24 * ONE_HOUR,
      // Inviting the same address again replaces the previous invitation.
      cancelPendingInvitationsOnReInvite: true,
      sendInvitationEmail: sendInvitation,
      organizationHooks,
    }),
  ],

  databaseHooks: {
    user: {
      update: {
        // The twoFactor plugin turns `twoFactorEnabled` on when the first code is checked
        // (verify-totp) and off on disable: tell the owner of the account.
        after: async (user, ctx) => {
          if (ctx?.path !== "/two-factor/verify-totp" && ctx?.path !== "/two-factor/disable")
            return;
          await sendEmail(
            user.email,
            await renderTwoFactorChanged({
              appUrl: env.APP_URL,
              name: user.name,
              reason: user.twoFactorEnabled ? "enabled" : "disabled",
            }),
          );
        },
      },
    },
    session: {
      create: {
        // Open each new session on the user's first organisation (if any).
        before: async (session) => {
          const membership = await prisma.member.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: "asc" },
            select: { organizationId: true },
          });
          return { data: { ...session, activeOrganizationId: membership?.organizationId ?? null } };
        },
      },
    },
  },

  hooks: {
    // Names sent in another encoding than UTF-8 arrive with U+FFFD: refuse them rather than
    // storing « Invit�e » (sign-up, profile, organisation create/update).
    before: createAuthMiddleware(async (ctx) => {
      const body: unknown = ctx.body;
      if (!body || typeof body !== "object") return;
      const data = "data" in body && body.data && typeof body.data === "object" ? body.data : {};
      const names = [
        "name" in body ? body.name : undefined,
        "name" in data ? data.name : undefined,
      ];
      if (names.some((name) => typeof name === "string" && !isReadableText(name))) {
        throw new APIError("BAD_REQUEST", { code: "UNREADABLE_TEXT", message: "UNREADABLE_TEXT" });
      }
    }),
    // Notify the owner whenever their password changes from the account settings or new
    // backup codes are generated, and follow membership changes (see organization-events.ts).
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/organization/")) {
        // Audit and access clean-up for role changes, removals and departures.
        await afterMembershipChange(
          ctx.path,
          ctx.context.returned,
          // The session is not attached to the context for these endpoints: read it.
          (await getSessionFromCtx(ctx))?.user,
          ctx.request,
        );
        return;
      }
      if (ctx.path === "/two-factor/generate-backup-codes") {
        const user = ctx.context.session?.user;
        if (!user || ctx.context.returned instanceof Error) return;
        await sendEmail(
          user.email,
          await renderTwoFactorChanged({
            appUrl: env.APP_URL,
            name: user.name,
            reason: "backup-codes",
          }),
        );
        return;
      }
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
