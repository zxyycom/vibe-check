/** One-off synchronous observations for serial, constant-work public Runs.
 * This state belongs only to the isolated profiling copy and is reset outside
 * each run-only timing window. It is not a Scheduler measurement collector.
 */
export interface PrepareSpan {
  readonly inclusiveMs: number;
  readonly normalizeCatalogMs: number;
  readonly validateMs: number;
  readonly dtoFreezeMs: number;
}
export interface RunStages {
  readonly planMs: readonly number[];
  readonly prepare: readonly PrepareSpan[];
  readonly schedulerStateSetupMs: readonly number[];
  readonly schedulerLoopInclusiveMs: readonly number[];
}
let planMs: number[] = [];
let prepare: PrepareSpan[] = [];
let schedulerStateSetupMs: number[] = [];
let schedulerLoopInclusiveMs: number[] = [];
export function resetObservations(): void {
  planMs = [];
  prepare = [];
  schedulerStateSetupMs = [];
  schedulerLoopInclusiveMs = [];
}
export function observePlan(startedAt: number, endedAt: number): void {
  planMs.push(endedAt - startedAt);
}
export function observePrepare(
  startedAt: number,
  normalizedAt: number,
  validatedAt: number,
  endedAt: number
): void {
  prepare.push({
    inclusiveMs: endedAt - startedAt,
    normalizeCatalogMs: normalizedAt - startedAt,
    validateMs: validatedAt - normalizedAt,
    dtoFreezeMs: endedAt - validatedAt
  });
}
export function observeSchedulerStateSetup(startedAt: number, endedAt: number): void {
  schedulerStateSetupMs.push(endedAt - startedAt);
}
export function observeSchedulerLoop(startedAt: number, endedAt: number): void {
  schedulerLoopInclusiveMs.push(endedAt - startedAt);
}
export function readObservations(): RunStages {
  return { planMs, prepare, schedulerStateSetupMs, schedulerLoopInclusiveMs };
}
