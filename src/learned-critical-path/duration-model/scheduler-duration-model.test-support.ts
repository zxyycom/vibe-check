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
