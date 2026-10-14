import nodemailer from "nodemailer";
import type { EmailMessage, EmailTransport } from "./types";

export type SmtpConfig = {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
};

/** SMTP delivery — Mailpit in development, or any SMTP relay in production. */
export function createSmtpTransport(config: SmtpConfig): EmailTransport {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
  });

  return {
    async send(message: EmailMessage) {
      await transporter.sendMail({ from: config.from, ...message });
    },
  };
}
