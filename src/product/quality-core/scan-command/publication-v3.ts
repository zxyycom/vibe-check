import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { join } from "node:path";

import type { GateResult } from "../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  planPublicationCleanupV3,
  projectMachinePublicationV3,
  projectReadablePublicationV3,
  serializeMachinePublicationV3,
  validateMachinePublicationSetV3,
  type ReadablePublicationContractV3,
  type ReadableReportContractV3,
  type ValidatedPublicationModelV3
} from "../output/publication-v3/index.ts";

const PREVIEW_LIMIT = 5;

export interface PublishedScanV3 {
  readonly readable: ReadablePublicationContractV3;
}

interface PublicationCandidatePath {
  readonly canonical: string;
  readonly contents: string;
  readonly kind: "machine" | "report";
  readonly temp: string;
}

export function publishScanV3(
  input: Readonly<{
    artifactDir: string;
    changedFiles: readonly string[];
    model: ValidatedPublicationModelV3;
    print?: boolean;
    reportPresentation: ResolvedQualityConfig["report"];
  }>
): PublishedScanV3 {
  const machine = projectMachinePublicationV3(input.model);
  const candidates = serializeMachinePublicationV3(machine);
  const readable = projectReadablePublicationV3({
    model: input.model,
    report: {
      changedFiles: input.changedFiles,
      presentation: input.reportPresentation
    }
  });
  const report = renderReportV3(input.model, readable.report);
  const validation = validateMachinePublicationSetV3({
    recordsNdjson: Buffer.from(candidates.recordsNdjson, "utf8"),
    runJson: Buffer.from(candidates.runJson, "utf8")
  });
  if (!validation.ok) {
    throw new Error(`Machine publication v3 validation failed: ${validation.diagnostic.message}`);
  }

  publishCandidates(input.artifactDir, {
    recordsNdjson: candidates.recordsNdjson,
    report,
    runJson: candidates.runJson
  });
  if (input.print ?? true)
    printPublicationSummaryV3({
      artifactDir: input.artifactDir,
      model: input.model,
      readable: readable.console
    });

  return Object.freeze({ readable: readable.console });
}

export function cleanupPublicationV3(artifactDir: string): void {
  const plan = planPublicationCleanupV3(artifactDir);
  removePaths([...plan.canonicalPaths, ...plan.retiredPaths, ...plan.ownedTempPaths]);
}

export function cleanupPublicationV3BestEffort(artifactDir: string): void {
  try {
    cleanupPublicationV3(artifactDir);
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
  fs.mkdirSync(artifactDir, { recursive: true });
  const token = randomUUID();
  const files = publicationCandidatePaths(artifactDir, token, candidates);
  let hasReplacedCanonicalPath = false;
  try {
    fs.mkdirSync(join(artifactDir, "raw"), { recursive: true });
    cleanupOwnedTemps(artifactDir);
    for (const file of files) {
      fs.writeFileSync(file.temp, file.contents, { encoding: "utf8", flag: "wx" });
    }
    for (const file of files) {
      if (file.kind !== "machine") continue;
      fs.renameSync(file.temp, file.canonical);
      hasReplacedCanonicalPath = true;
    }
    const report = files.find((file) => file.kind === "report");
    if (report === undefined) throw new Error("Publication report candidate is missing");
    fs.renameSync(report.temp, report.canonical);
    cleanupRetiredArtifacts(artifactDir);
  } catch (error: unknown) {
    if (hasReplacedCanonicalPath) cleanupPublicationV3BestEffort(artifactDir);
    else cleanupOwnedTempsBestEffort(artifactDir);
    throw error;
  }
}

function publicationCandidatePaths(
  artifactDir: string,
  token: string,
  candidates: Readonly<{
    recordsNdjson: string;
    report: string;
    runJson: string;
  }>
): readonly PublicationCandidatePath[] {
  return [
    {
      canonical: join(artifactDir, "run.json"),
      contents: candidates.runJson,
      kind: "machine",
      temp: join(artifactDir, `.vibe-check-publication-${token}-run.json.tmp`)
    },
    {
      canonical: join(artifactDir, "records.ndjson"),
      contents: candidates.recordsNdjson,
      kind: "machine",
      temp: join(artifactDir, `.vibe-check-publication-${token}-records.ndjson.tmp`)
    },
    {
      canonical: join(artifactDir, "report.md"),
      contents: candidates.report,
      kind: "report",
      temp: join(artifactDir, `.vibe-check-publication-${token}-report.md.tmp`)
    }
  ];
}

function cleanupOwnedTemps(artifactDir: string): void {
  removePaths(planPublicationCleanupV3(artifactDir).ownedTempPaths);
}

function cleanupOwnedTempsBestEffort(artifactDir: string): void {
  try {
    cleanupOwnedTemps(artifactDir);
  } catch {
    // Failure cleanup cannot conceal the original publication failure.
  }
}

function cleanupRetiredArtifacts(artifactDir: string): void {
  removePaths(planPublicationCleanupV3(artifactDir).retiredPaths);
}

function removePaths(paths: readonly string[]): void {
  let hasFailure = false;
  let firstFailure: unknown;
  for (const path of paths) {
    try {
      fs.rmSync(path, { force: true, recursive: true });
    } catch (error: unknown) {
      if (!hasFailure) firstFailure = error;
      hasFailure = true;
    }
  }
  if (hasFailure) throw firstFailure;
}

function renderReportV3(
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
