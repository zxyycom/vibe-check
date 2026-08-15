/**
 * Output projections are validated or freshly constructed plain data. Freeze
 * them before they cross a publication boundary so later consumers cannot
 * drift from the one validated model.
 */
export function freezePublicationValue<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezePublicationValue(child);
  }
  return value;
}
