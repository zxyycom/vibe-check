export function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} did not emit JSON: ${text}`);
  }
}

export function record(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
