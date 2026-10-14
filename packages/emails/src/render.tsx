import { render } from "@react-email/components";
import type { ReactElement } from "react";
import ConfirmEmailChange, { type ConfirmEmailChangeProps } from "./templates/confirm-email-change";
import DeleteAccount, { type DeleteAccountProps } from "./templates/delete-account";
import Invitation, { type InvitationProps } from "./templates/invitation";
import PasswordChanged, { type PasswordChangedProps } from "./templates/password-changed";
import ResetPassword, { type ResetPasswordProps } from "./templates/reset-password";
import VerifyEmail, { type VerifyEmailProps } from "./templates/verify-email";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

async function renderBoth(element: ReactElement): Promise<Omit<RenderedEmail, "subject">> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

export async function renderVerifyEmail(props: VerifyEmailProps): Promise<RenderedEmail> {
  return {
    subject: "Confirmez votre adresse email",
    ...(await renderBoth(<VerifyEmail {...props} />)),
  };
}

export async function renderResetPassword(props: ResetPasswordProps): Promise<RenderedEmail> {
  return {
    subject: "Réinitialisation de votre mot de passe",
    ...(await renderBoth(<ResetPassword {...props} />)),
  };
}

export async function renderPasswordChanged(props: PasswordChangedProps): Promise<RenderedEmail> {
  return {
    subject:
      props.reason === "set"
        ? "Un mot de passe a été ajouté à votre compte"
        : "Votre mot de passe a été modifié",
    ...(await renderBoth(<PasswordChanged {...props} />)),
  };
}

export async function renderConfirmEmailChange(
  props: ConfirmEmailChangeProps,
): Promise<RenderedEmail> {
  return {
    subject: "Confirmez le changement d’adresse email",
    ...(await renderBoth(<ConfirmEmailChange {...props} />)),
  };
}

export async function renderDeleteAccount(props: DeleteAccountProps): Promise<RenderedEmail> {
  return {
    subject: "Confirmez la suppression de votre compte",
    ...(await renderBoth(<DeleteAccount {...props} />)),
  };
}

export async function renderInvitation(props: InvitationProps): Promise<RenderedEmail> {
  return {
    subject: `${props.inviterName} vous invite à rejoindre ${props.organizationName}`,
    ...(await renderBoth(<Invitation {...props} />)),
  };
}
