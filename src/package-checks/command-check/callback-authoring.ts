import { snapshotContextCallback } from "../../data-boundary/context-callback.ts";
import type {
  CommandEnvironmentContext,
  CommandCheckEnvironment,
  AfterCommandInput,
  AfterCommandContext,
  AfterCommand,
  CommandEnvironmentResolver,
  ResolvedCommandCheckOptions
} from "./contract.ts";
import type { CheckResult, DeepReadonly } from "../../check/check.ts";
import { snapshotClosedPolicyRecord } from "../../data-boundary/closed-values.ts";

export function resolveAfterCommand(value: unknown): AfterCommand | undefined {
  if (value === undefined) return undefined;
  const afterCommand = snapshotClosedPolicyRecord(value, {
    optional: ["parseData"],
    required: ["execute"]
  });
  if (afterCommand === undefined) return undefined;
  const execute = snapshotContextCallback<
    [AfterCommandInput],
    AfterCommandContext,
    CheckResult | Promise<CheckResult>
  >(afterCommand.execute, [
    "artifactDirectory",
    "dependencies",
    "invocationId",
    "project",
    "records",
    "signal"
  ]);
  if (execute === undefined) return undefined;
  if (afterCommand.parseData !== undefined && !isCheckDataParser(afterCommand.parseData)) {
    return undefined;
  }
  return Object.freeze({
    execute,
    ...(afterCommand.parseData === undefined ? {} : { parseData: afterCommand.parseData })
  });
}

export function resolveEnvironmentResolver(value: unknown): CommandEnvironmentResolver | undefined {
  if (value === undefined) return undefined;
  return snapshotContextCallback<
    [DeepReadonly<ResolvedCommandCheckOptions>],
    CommandEnvironmentContext,
    CommandCheckEnvironment | Promise<CommandCheckEnvironment>
  >(value, ["dependencies", "project", "signal"]);
}

function isCheckDataParser(value: unknown): value is NonNullable<AfterCommand["parseData"]> {
  return typeof value === "function";
}
