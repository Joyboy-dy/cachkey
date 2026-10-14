export type DeviceInfo = {
  /** e.g. « Chrome sur Windows », « Appareil inconnu ». */
  label: string;
  mobile: boolean;
  /** The Cachkey command-line tool. */
  cli?: boolean;
};

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** Human-readable description of a session's user agent (no raw string shown to users). */
export function describeUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) return { label: "Appareil inconnu", mobile: false };
  // Sessions opened with `cachkey login` (see apps/cli).
  if (userAgent.startsWith("cachkey-cli/")) {
    const host = /\(([^)]+)\)/.exec(userAgent)?.[1];
    return {
      label: host ? `Ligne de commande sur ${host}` : "Ligne de commande",
      mobile: false,
      cli: true,
    };
  }
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const mobile = /Mobi|iPhone|Android/.test(userAgent);
  if (browser && system) return { label: `${browser} sur ${system}`, mobile };
  return { label: browser ?? system ?? "Appareil inconnu", mobile };
}
