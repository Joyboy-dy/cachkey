import { describe, expect, test } from "bun:test";
import {
  renderConfirmEmailChange,
  renderDeleteAccount,
  renderInvitation,
  renderPasswordChanged,
  renderResetPassword,
  renderTwoFactorChanged,
  renderVerifyEmail,
} from "./render";

const appUrl = "https://cachkey.example";
const url = `${appUrl}/action?token=exemple`;

const emails = {
  verifyEmail: () => renderVerifyEmail({ appUrl, name: "Alex", verificationUrl: url }),
  resetPassword: () => renderResetPassword({ appUrl, name: "Alex", resetUrl: url }),
  passwordChanged: () => renderPasswordChanged({ appUrl, name: "Alex", reason: "changed" }),
  twoFactorChanged: () => renderTwoFactorChanged({ appUrl, name: "Alex", reason: "enabled" }),
  confirmEmailChange: () =>
    renderConfirmEmailChange({ appUrl, name: "Alex", newEmail: "a@b.fr", confirmUrl: url }),
  deleteAccount: () => renderDeleteAccount({ appUrl, name: "Alex", deleteUrl: url }),
  invitation: () =>
    renderInvitation({
      appUrl,
      inviterName: "Awa",
      organizationName: "Studio",
      roleLabel: "membre",
      acceptUrl: url,
    }),
};

/** Poorly supported by mail clients (caniemail.com), see `components/email-layout.tsx`. */
const unsupported = [
  /<link\b/,
  /<hr\b/,
  /[;"]margin[:-]/,
  /[;"]display:/,
  /opacity:/,
  /overflow:/,
  /outline:/,
  /word-break:/,
  /max-height:/,
  /font-weight:/,
];

describe("emails", () => {
  for (const [name, render] of Object.entries(emails)) {
    test(`${name}: only well-supported HTML and CSS`, async () => {
      const { html, text } = await render();
      for (const pattern of unsupported) expect(html).not.toMatch(pattern);
      expect(text.length).toBeGreaterThan(0);
    });
  }
});
