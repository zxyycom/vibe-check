export type BunJUnitCase = {
  name: string;
  className: string;
  file: string;
  line: number;
};

export function parseBunJUnit(source: string): BunJUnitCase[] {
  return parseBunJUnitReport(source).cases;
}

/** Parses one registration-only report and proves every reported test stayed skipped. */
export function parseBunRegistrationJUnit(source: string): BunJUnitCase[] {
  const report = parseBunJUnitReport(source);
  const skippedElements = [...source.matchAll(/<skipped\b[^>]*\/?>/gu)].length;
  if (report.skipped !== report.tests || skippedElements !== report.tests) {
    throw new Error(
      `registration report must skip every test; reported ${report.skipped} skipped root tests and ${skippedElements} skipped testcase elements for ${report.tests} tests`
    );
  }
  return report.cases;
}

function parseBunJUnitReport(
  source: string
): Readonly<{ readonly cases: BunJUnitCase[]; readonly skipped: number; readonly tests: number }> {
  const rootMatch = /<testsuites\b([^>]*)>/u.exec(source);
  if (rootMatch === null) throw new Error("testsuites root is missing");
  const attributes = parseXmlAttributes(rootMatch[1]);
  const tests = parseNonNegativeInteger(attributes.tests, "tests");
  const failures = parseNonNegativeInteger(attributes.failures, "failures");
  const skipped = parseOptionalNonNegativeInteger(attributes.skipped, "skipped");
  if (failures !== 0) throw new Error(`report contains ${failures} failure(s)`);
  const cases = [...source.matchAll(/<testcase\b([^>]*)\/?>/gu)].map((match) =>
    parseBunJUnitCase(match[1])
  );
  if (cases.length !== tests)
    throw new Error(
      `testsuites reports ${tests} tests but contains ${cases.length} testcase elements`
    );
  return Object.freeze({ cases, skipped, tests });
}

function parseBunJUnitCase(source: string): BunJUnitCase {
  const attributes = parseXmlAttributes(source);
  if (
    attributes.name === undefined ||
    attributes.file === undefined ||
    attributes.line === undefined
  )
    throw new Error("testcase is missing name, file or line");
  const line = parseNonNegativeInteger(attributes.line, "testcase line");
  if (line < 1) throw new Error("testcase line must be 1-based");
  return {
    name: attributes.name,
    className: attributes.classname ?? "",
    file: attributes.file.replaceAll("\\", "/"),
    line
  };
}

function parseXmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/gu))
    attributes[match[1]] = decodeXml(match[2]);
  return attributes;
}

function decodeXml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/gu, decodeXmlEntity);
}

function decodeXmlEntity(entity: string): string {
  switch (entity) {
    case "&amp;":
      return "&";
    case "&lt;":
      return "<";
    case "&gt;":
      return ">";
    case "&quot;":
      return '"';
    case "&apos;":
      return "'";
    default:
      return entity.startsWith("&#x")
        ? String.fromCodePoint(Number.parseInt(entity.slice(3, -1), 16))
        : String.fromCodePoint(Number.parseInt(entity.slice(2, -1), 10));
  }
}

function parseNonNegativeInteger(value: string | undefined, label: string): number {
  if (value === undefined || !/^\d+$/u.test(value))
    throw new Error(`${label} must be a non-negative integer`);
  return Number.parseInt(value, 10);
}

function parseOptionalNonNegativeInteger(value: string | undefined, label: string): number {
  return value === undefined ? 0 : parseNonNegativeInteger(value, label);
}
