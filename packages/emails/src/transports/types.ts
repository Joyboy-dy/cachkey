export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Minimal contract every delivery backend implements. */
export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}
