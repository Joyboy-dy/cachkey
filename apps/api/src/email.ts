import {
  createResendTransport,
  createSmtpTransport,
  type EmailTransport,
  type RenderedEmail,
} from "@cachkey/emails";
import { env } from "./env";

function createTransport(): EmailTransport {
  if (env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY) {
    return createResendTransport({ from: env.EMAIL_FROM, apiKey: env.RESEND_API_KEY });
  }
  return createSmtpTransport({
    from: env.EMAIL_FROM,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
  });
}

const transport = createTransport();

/**
 * Sends a rendered email. Failures are logged rather than thrown so that auth flows
 * do not leak whether an address exists; users can always request a new email.
 */
export async function sendEmail(to: string, email: RenderedEmail): Promise<void> {
  try {
    await transport.send({ to, ...email });
  } catch (error) {
    console.error(`[email] Failed to send "${email.subject}"`, error);
  }
}
