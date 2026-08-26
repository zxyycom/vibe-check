import type {
  ProjectDefinition,
  ProjectOutputs
} from "../project-definition/project-definition.ts";
import type { RunControls } from "./controls/contract.ts";
export function effectiveOutputs(
  definition: ProjectDefinition,
  controls: RunControls
): ProjectOutputs {
  return Object.freeze({
    machinePublication: Object.freeze({
      ...definition.outputs.machinePublication,
      ...controls.outputs?.machinePublication
    }),
    progressRendering: Object.freeze({
      ...definition.outputs.progressRendering,
      ...controls.outputs?.progressRendering
    })
  });
}
