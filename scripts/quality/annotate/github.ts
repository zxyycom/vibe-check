import type { MachineRecordV2 } from "../../../src/product/run/machine-output.ts";

type AnnotationRecord = Pick<MachineRecordV2, "location" | "message" | "recordTypeId">;

export function renderGithubAnnotations(records: readonly AnnotationRecord[]): string[] {
  return records.map((record) => {
    const attrs = [
      ["file", record.location?.path],
      ["line", record.location?.line],
      ["title", record.recordTypeId]
    ]
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${key}=${escapeProperty(String(value))}`)
      .join(",");

    return `::warning ${attrs}::${escapeData(record.message)}`;
  });
}

function escapeData(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
