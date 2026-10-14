const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/** « 14 octobre 2026 à 12:15 » */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value));
}

/** « 14 octobre 2026 » */
export function formatDate(value: string | Date): string {
  return date.format(new Date(value));
}
