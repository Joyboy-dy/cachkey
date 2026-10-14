/**
 * U+FFFD is what a server reads when a client sends text in another encoding than UTF-8
 * (« Invit�e » instead of « Invitée »). Such text is refused instead of being stored corrupted.
 */
export const REPLACEMENT_CHARACTER = "�";

export const UNREADABLE_TEXT_MESSAGE =
  "Ce texte contient des caractères illisibles. Saisissez-le à nouveau.";

export function isReadableText(value: string): boolean {
  return !value.includes(REPLACEMENT_CHARACTER);
}
