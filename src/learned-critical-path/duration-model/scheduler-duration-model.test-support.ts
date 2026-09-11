import type { SchedulerPredictionInput } from "./prediction.ts";

export function predictionInputs(ids: readonly string[]): readonly SchedulerPredictionInput[] {
  return Object.freeze(
    ids.map((id) =>
      Object.freeze({
        authoredOptions: Object.freeze({ id, privateToken: `author-secret-${id}` }),
        checkId: id,
        flags: Object.freeze(["enabled", "flag-secret"]),
        taskId: id
      })
    )
  );
}

export function requiredPredictionInput(
  inputs: readonly SchedulerPredictionInput[],
  index: number
): SchedulerPredictionInput {
  const input = inputs[index];
  if (input === undefined) throw new Error(`missing scheduler prediction input at index ${index}`);
  return input;
}
