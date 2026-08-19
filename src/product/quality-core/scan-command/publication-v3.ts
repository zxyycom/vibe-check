import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  projectMachinePublicationV3,
  projectReadablePublicationV3,
  serializeMachinePublicationV3,
  validateMachinePublicationSetV3,
  type ReadablePublicationContractV3,
  type ValidatedPublicationModelV3
} from "../output/publication-v3/index.ts";
import { publishPublicationCandidatesV3 } from "./publication-v3-files.ts";
import { printPublicationSummaryV3, renderReportV3 } from "./publication-v3-readable.ts";

export { cleanupPublicationV3, cleanupPublicationV3BestEffort } from "./publication-v3-files.ts";
export { printPublicationSummaryV3 } from "./publication-v3-readable.ts";

export interface PublishedScanV3 {
  readonly readable: ReadablePublicationContractV3;
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

  publishPublicationCandidatesV3(input.artifactDir, {
    recordsNdjson: candidates.recordsNdjson,
    report,
    runJson: candidates.runJson
  });
  if (input.print ?? true) {
    printPublicationSummaryV3({
      artifactDir: input.artifactDir,
      model: input.model,
      readable: readable.console
    });
  }

  return Object.freeze({ readable: readable.console });
}
