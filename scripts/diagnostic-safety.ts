/** Validates an owner-local Record identity before it enters a human or machine diagnostic channel. */
export function isSafeDiagnosticIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][A-Za-z0-9%:._/-]*$/u.test(value);
}

/** Rejects control characters so a provider cannot forge terminal or stderr output. */
export function isSafeDiagnosticPresentation(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || isUnsafePresentationCodePoint(codePoint)) return false;
  }
  return true;
}

function isUnsafePresentationCodePoint(codePoint: number): boolean {
  return isAsciiOrC1Control(codePoint) || isUnicodeLineSeparator(codePoint);
}

function isAsciiOrC1Control(codePoint: number): boolean {
  return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function isUnicodeLineSeparator(codePoint: number): boolean {
  return codePoint === 0x2028 || codePoint === 0x2029;
}
