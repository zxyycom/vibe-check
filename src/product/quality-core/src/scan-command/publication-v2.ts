import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

import type { GateResult } from "../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  planPublicationCleanupV2,
  mapPublicationOutcomeV2,
  projectMachinePublicationV2,
  projectReadablePublicationV2,
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2,
  type ReadablePublicationContractV2,
  type ReadableReportContractV2,
  type ValidatedPublicationModelV2
} from "../output/publication-v2/index.ts";
import type { QualityScanProcessOutcome } from "./command-model.ts";

const PREVIEW_LIMIT = 5;

export interface PublishedScanV2 {
  readonly outcome: QualityScanProcessOutcome;
  readonly readable: ReadablePublicationContractV2;
}

export function publishScanV2(input: Readonly<{
  artifactDir: string;
  changedFiles: readonly string[];
  model: ValidatedPublicationModelV2;
  reportPresentation: ResolvedQualityConfig["report"];
}>): PublishedScanV2 {
  const machine = projectMachinePublicationV2(input.model);
  const candidates = serializeMachinePublicationV2(machine);
  const readable = projectReadablePublicationV2({
    model: input.model,
    report: {
      changedFiles: input.changedFiles,
      presentation: input.reportPresentation
    }
  });
  const report = renderReportV2(input.model, readable.report);
  const validation = validateMachinePublicationSetV2({
    recordsNdjson: Buffer.from(candidates.recordsNdjson, "utf8"),
    runJson: Buffer.from(candidates.runJson, "utf8")
  });
  if (!validation.ok) {
    throw new Error(
      `Machine publication v2 validation failed: ${validation.diagnostic.message}`
    );
  }

  publishCandidates(input.artifactDir, {
    recordsNdjson: candidates.recordsNdjson,
    report,
    runJson: candidates.runJson
  });
  printPublishedScan({
    artifactDir: input.artifactDir,
    model: input.model,
    readable: readable.console
  });

  const { outcome } = mapPublicationOutcomeV2({
    model: input.model,
    publicationStatus: "succeeded"
  });
  return Object.freeze({ outcome, readable: readable.console });
}

export function cleanupPublicationV2(artifactDir: string): void {
  const plan = planPublicationCleanupV2(artifactDir);
  for (const path of [
    ...plan.canonicalPaths,
    ...plan.retiredPaths,
    ...plan.ownedTempPaths
  ]) {
    rmSync(path, { force: true, recursive: true });
  }
}

export function cleanupPublicationV2BestEffort(artifactDir: string): void {
  try {
    cleanupPublicationV2(artifactDir);
  } catch {
    // Failure cleanup cannot conceal the original publication failure.
  }
}

function publishCandidates(
  artifactDir: string,
  candidates: Readonly<{
    recordsNdjson: string;
    report: string;
    runJson: string;
  }>
): void {
  mkdirSync(artifactDir, { recursive: true });
  const token = randomUUID();
  const files = [{
    name: "run.json",
    contents: candidates.runJson
  }, {
    name: "records.ndjson",
    contents: candidates.recordsNdjson
  }, {
    name: "report.md",
    contents: candidates.report
  }];
  const temps = files.map(({ name }) => ({
    canonical: join(artifactDir, name),
    temp: join(artifactDir, `.vibe-check-publication-${token}-${name}.tmp`)
  }));
  try {
    mkdirSync(join(artifactDir, "raw"), { recursive: true });
    cleanupPublicationV2(artifactDir);
    for (const [index, file] of files.entries()) {
      writeFileSync(temps[index]!.temp, file.contents, { encoding: "utf8", flag: "wx" });
    }
    for (const path of temps) renameSync(path.temp, path.canonical);
  } catch (error: unknown) {
    cleanupPublicationV2BestEffort(artifactDir);
    throw error;
  }
}

function renderReportV2(
  model: ValidatedPublicationModelV2,
  readable: ReadableReportContractV2
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
    `- **Snapshot completeness**: ${model.snapshot.completeness.status}`,
    `- **${readable.statuses.quality.label}**: ${readable.statuses.quality.status}`,
    `- **${readable.statuses.verification.label}**: ${readable.statuses.verification.status}`,
    `- **Gate status**: ${model.decision.gate.status}`,
    `- **Policy**: ${model.decision.policyId ?? "disabled"}`,
    "",
    "## Check runs",
    "",
    ...model.snapshot.runs.map((run) => (
      `- \`${run.checkId}\`: ${run.status}` +
      (run.result === null ? "" : ` / ${run.result.verdict}`)
    )),
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
      ? [
        "## Changed record watchlist",
        "",
        ...reportRecords(readable.watchlistRecords),
        ""
      ]
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

function reportRecords(
  records: ReadablePublicationContractV2["warningRecords"]
): string[] {
  if (records.length === 0) return ["None."];
  return records.map((record) => {
    const location = record.location === null
      ? ""
      : ` (${record.location.path}:${record.location.line})`;
    const acceptance = record.acceptance.length === 0
      ? ""
      : ` — accepted: ${record.acceptance.map(({ reason }) => reason).join("; ")}`;
    return `- **${record.level}**${location}: ${record.message}${acceptance}`;
  });
}

function printPublishedScan(input: Readonly<{
  artifactDir: string;
  model: ValidatedPublicationModelV2;
  readable: ReadablePublicationContractV2;
}>): void {
  console.log("");
  console.log("─".repeat(60));
  console.log("Summary:");
  console.log(`  Check runs: ${input.model.snapshot.runs.length}`);
  console.log(`  Records: ${input.model.records.length}`);
  console.log(`  Snapshot completeness: ${input.model.snapshot.completeness.status}`);
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
    const location = record.location === null
      ? ""
      : `${record.location.path}:${record.location.line} - `;
    console.log(`  ${index + 1}. [${record.level}] ${location}${record.message}`);
    for (const acceptance of record.acceptance) {
      console.log(`     Accepted reason: ${acceptance.reason}`);
    }
  }
  if (previews.length > PREVIEW_LIMIT) {
    console.log(`  ... and ${previews.length - PREVIEW_LIMIT} more records`);
  }

  console.log("");
  console.log(status === "failed"
    ? "❌ Quality scan failed."
    : status === "warning"
      ? "⚠️ Quality scan complete with warnings."
      : "✅ Quality scan complete.");
  console.log(`Artifacts in: ${input.artifactDir}/`);
  console.log(`  run.json → ${join(input.artifactDir, "run.json")}`);
  console.log(`  records.ndjson → ${join(input.artifactDir, "records.ndjson")}`);
  console.log(`  report.md → ${join(input.artifactDir, "report.md")}`);
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
