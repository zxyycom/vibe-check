import { join } from "node:path";

import type { GateResult } from "../check-record/policy-model.ts";
import type {
  ReadablePublicationContractV3,
  ReadableReportContractV3,
  ValidatedPublicationModelV3
} from "../output/publication-v3/index.ts";

const PREVIEW_LIMIT = 5;

export function renderReportV3(
  model: ValidatedPublicationModelV3,
  readable: ReadableReportContractV3
): string {
  const timestamp = formatReportTimestamp(
    model.invocation.timestamp,
    readable.presentation.timeZone
  );
  const lines = [
    `# ${readable.presentation.title}`,
    "",
    `**${readable.presentation.nonBlockingNotice}**`,
    "",
    `- **Invocation**: ${model.invocation.invocationId}`,
    `- **Timestamp**: ${timestamp}`,
    `- **Checks**: ${model.snapshot.checks.length}`,
    `- **${readable.statuses.quality.label}**: ${readable.statuses.quality.status}`,
    `- **${readable.statuses.verification.label}**: ${readable.statuses.verification.status}`,
    `- **Gate status**: ${model.decision.gate.status}`,
    `- **Policy**: ${model.decision.policyId ?? "disabled"}`,
    "",
    "## Checks",
    "",
    ...model.snapshot.checks.map(
      (check) => `- \`${check.checkId}\`: ${formatCheckOutcome(check.outcome)}`
    ),
    "",
    "## Unaccepted records",
    "",
    ...reportRecords(readable.warningRecords),
    "",
    "## Accepted records",
    "",
    ...reportRecords(readable.acceptedRecords),
    "",
    ...(readable.presentation.showWatchlist
      ? ["## Changed record watchlist", "", ...reportRecords(readable.watchlistRecords), ""]
      : []),
    "---",
    "",
    `*Report generated at ${timestamp} by ${readable.presentation.footerGeneratedBy}*`,
    "",
    `*${readable.presentation.footerNotice}*`,
    ""
  ];
  return `${lines.join("\n")}\n`;
}

export function printPublicationSummaryV3(
  input: Readonly<{
    artifactDir?: string;
    model: ValidatedPublicationModelV3;
    readable: ReadablePublicationContractV3;
  }>
): void {
  console.log("");
  console.log("─".repeat(60));
  console.log("Summary:");
  console.log(`  Checks: ${input.model.snapshot.checks.length}`);
  console.log(`  Records: ${input.model.records.length}`);
  console.log("─".repeat(60));
  printGate(input.model.decision.gate);

  const status = input.model.humanStatus.selected;
  const label = input.model.verificationOutput
    ? input.readable.statuses.verification.label
    : input.readable.statuses.quality.label;
  const previews = input.model.verificationOutput
    ? input.readable.warningRecords
    : [...input.readable.warningRecords, ...input.readable.acceptedRecords];
  console.log("");
  console.log(`${label}: ${status}`);
  for (const [index, record] of previews.slice(0, PREVIEW_LIMIT).entries()) {
    const location =
      record.location === null ? "" : `${record.location.path}:${record.location.line} - `;
    console.log(`  ${index + 1}. [${record.level}] ${location}${record.message}`);
    for (const acceptance of record.acceptance) {
      console.log(`     Accepted reason: ${acceptance.reason}`);
    }
  }
  if (previews.length > PREVIEW_LIMIT) {
    console.log(`  ... and ${previews.length - PREVIEW_LIMIT} more records`);
  }

  console.log("");
  console.log(scanCompletionMessage(status));
  if (input.artifactDir !== undefined) {
    console.log(`Artifacts in: ${input.artifactDir}/`);
    console.log(`  run.json → ${join(input.artifactDir, "run.json")}`);
    console.log(`  records.ndjson → ${join(input.artifactDir, "records.ndjson")}`);
    console.log(`  report.md → ${join(input.artifactDir, "report.md")}`);
  }
}

function formatReportTimestamp(timestamp: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "longOffset",
    year: "numeric"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value])
  );
  return [
    `${parts.year}-${parts.month}-${parts.day}`,
    `${parts.hour}:${parts.minute}:${parts.second}`,
    `${parts.timeZoneName} (${timeZone}; source ${timestamp})`
  ].join(" ");
}

function reportRecords(records: ReadablePublicationContractV3["warningRecords"]): string[] {
  if (records.length === 0) return ["None."];
  return records.map((record) => {
    const location =
      record.location === null ? "" : ` (${record.location.path}:${record.location.line})`;
    const acceptance =
      record.acceptance.length === 0
        ? ""
        : ` — accepted: ${record.acceptance.map(({ reason }) => reason).join("; ")}`;
    return `- **${record.level}**${location}: ${record.message}${acceptance}`;
  });
}

function printGate(gate: GateResult): void {
  if (gate.status === "disabled") return;
  if (gate.status === "not-evaluated") {
    console.error("❌ Quality gate was not evaluated.");
    console.error(`  Policy: ${gate.policyId}`);
    console.error(`  Status: ${gate.status}`);
    console.error(`  Reason: ${gate.reason}`);
    return;
  }
  console.log(`${gate.status === "passed" ? "✅" : "❌"} Quality gate ${gate.status}.`);
  console.log(`  Policy: ${gate.policyId}`);
  console.log(`  Status: ${gate.status}`);
  console.log(`  Blocking records: ${gate.blockingRecordRefs.length}`);
}

function scanCompletionMessage(
  status: ValidatedPublicationModelV3["humanStatus"]["selected"]
): string {
  if (status === "failed") return "❌ Quality scan failed.";
  if (status === "warning") return "⚠️ Quality scan complete with warnings.";
  return "✅ Quality scan complete.";
}

function formatCheckOutcome(
  outcome: ValidatedPublicationModelV3["snapshot"]["checks"][number]["outcome"]
): string {
  if (outcome.status === "completed") return `${outcome.status} / ${outcome.verdict}`;
  if (outcome.status === "unavailable") return `${outcome.status} / ${outcome.reason.code}`;
  return outcome.status;
}
