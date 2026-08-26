import { projectMachinePublicationV4 } from "./projection.ts";
import { serializeMachinePublicationV4 } from "./serializers.ts";
import { validateMachinePublicationSetV4 } from "./validation.ts";
import { type TrustedPublicationModelV4 } from "./publication-model.ts";
import { publishPublicationCandidatesV4 } from "./atomic-publication.ts";

export { cleanupPublicationV4, cleanupPublicationV4BestEffort } from "./atomic-publication.ts";

/** Publishes only the validated two-file machine set; human projection is not a v4 concern. */
export function publishScanV4(
  input: Readonly<{ artifactDir: string; model: TrustedPublicationModelV4 }>
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
