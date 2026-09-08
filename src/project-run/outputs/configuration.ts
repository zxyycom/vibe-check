import type {
  ProjectDefinition,
  ResolvedProjectOutputs
} from "../../project-definition/project-definition.ts";
import { resolveProgressRenderingOutput } from "../../project-definition/output-defaults.ts";
import type { RunControls } from "../controls/contract.ts";
export function effectiveOutputs(
  definition: ProjectDefinition,
  controls: RunControls
): ResolvedProjectOutputs {
  return Object.freeze({
    machinePublication: Object.freeze({
      ...definition.outputs.machinePublication,
      ...controls.outputs?.machinePublication
    }),
    progressRendering: resolveProgressRenderingOutput({
      ...definition.outputs.progressRendering,
      ...controls.outputs?.progressRendering
    }),
    diagnosticLogging: Object.freeze({
      ...definition.outputs.diagnosticLogging,
      ...controls.outputs?.diagnosticLogging
    })
  });
}
