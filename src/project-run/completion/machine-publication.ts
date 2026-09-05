import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import type { TrustedPublicationModelV4 } from "../../machine-output/v4/publication-model.ts";
import { publishScanV4 } from "../../machine-output/v4/publish.ts";
import type { OutputStatuses } from "../outputs/status.ts";
/** Publishes an already-trusted v4 model as the Run-owned machine output. */
export function publishMachineOutput(
  input: Readonly<{
    readonly configuration: ProjectOutputs["machinePublication"];
    readonly statuses: OutputStatuses;
    readonly model: TrustedPublicationModelV4;
    readonly directory: string;
  }>
): boolean {
  if (!input.configuration.enabled) return true;
  try {
    publishScanV4({ artifactDir: input.directory, model: input.model });
    input.statuses.succeeded("machinePublication");
    return true;
  } catch {
    input.statuses.failed("machinePublication");
    return false;
  }
}
