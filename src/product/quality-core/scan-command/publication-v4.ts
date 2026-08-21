import {
  projectMachinePublicationV4,
  serializeMachinePublicationV4,
  validateMachinePublicationSetV4,
  type ValidatedPublicationModelV4
} from "../output/publication-v4/index.ts";
import { publishPublicationCandidatesV4 } from "./publication-v4-files.ts";

export { cleanupPublicationV4, cleanupPublicationV4BestEffort } from "./publication-v4-files.ts";

/** Publishes only the validated two-file machine set; human projection is not a v4 concern. */
export function publishScanV4(
  input: Readonly<{ artifactDir: string; model: ValidatedPublicationModelV4 }>
): void {
  const machine = projectMachinePublicationV4(input.model);
  const candidates = serializeMachinePublicationV4(machine);
  const validation = validateMachinePublicationSetV4({
    recordsNdjson: Buffer.from(candidates.recordsNdjson, "utf8"),
    runJson: Buffer.from(candidates.runJson, "utf8")
  });
  if (!validation.ok) {
    throw new Error(`Machine publication v4 validation failed: ${validation.diagnostic.message}`);
  }
  publishPublicationCandidatesV4(input.artifactDir, candidates);
}
