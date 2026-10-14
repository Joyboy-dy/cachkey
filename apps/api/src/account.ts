import { renderPasswordChanged } from "@cachkey/emails";
import { setPasswordSchema } from "@cachkey/shared";
import { APIError } from "better-auth/api";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { sendEmail } from "./email";
import { env } from "./env";

/**
 * Account routes that Better Auth only exposes server-side.
 * Errors use the same `{ code, message }` shape as Better Auth so the web app maps them alike.
 */
export const accountRoutes = new Elysia({ prefix: "/api/account" }).post(
  "/set-password",
  async ({ request, body, set }) => {
    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid body" };
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: "Unauthorized" };
    }
    try {
      await auth.api.setPassword({
        headers: request.headers,
        body: { newPassword: parsed.data.newPassword },
      });
    } catch (error) {
      if (error instanceof APIError) {
        set.status = error.statusCode;
        return { code: error.body?.code ?? "UNKNOWN", message: error.message };
      }
      throw error;
    }
    await sendEmail(
      session.user.email,
      await renderPasswordChanged({ appUrl: env.APP_URL, name: session.user.name, reason: "set" }),
    );
    return { status: true };
  },
);
