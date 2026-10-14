import type { EmailMessage, EmailTransport } from "./types";

export type ResendConfig = {
  from: string;
  apiKey: string;
};

/** Resend delivery through its REST API (no SDK dependency required). */
export function createResendTransport(config: ResendConfig): EmailTransport {
  return {
    async send(message: EmailMessage) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: config.from, ...message }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
      }
    },
  };
}
