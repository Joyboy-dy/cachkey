/** Hosts that only exist on the developer's machine or network. */
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|.+\.(localhost|local|test))$/;

/**
 * Name under which authenticator apps list the account. A development or local instance
 * gets its own name, so its codes are never mistaken for those of a production instance.
 * No colon: it separates the issuer from the account in the otpauth:// label.
 */
export function twoFactorIssuer(appUrl: string, nodeEnv: string): string {
  const local = LOCAL_HOST.test(new URL(appUrl).hostname);
  return local || nodeEnv !== "production" ? "Cachkey (dev)" : "Cachkey";
}
