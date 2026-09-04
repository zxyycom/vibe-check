import { type Check, type CheckExecution } from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";

export const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

export function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly enabledByFlags?: Check["enabledByFlags"];
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
    readonly mutex?: readonly string[];
    readonly observes?: readonly string[];
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.dependsOn === undefined ? {} : { dependsOn: overrides.dependsOn }),
    ...(overrides.enabledByFlags === undefined ? {} : { enabledByFlags: overrides.enabledByFlags }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.mutex === undefined ? {} : { mutex: overrides.mutex }),
    ...(overrides.observes === undefined ? {} : { observes: overrides.observes })
  };
}

export function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false } }
  });
}

export function deferred(): Readonly<{
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is unavailable");
      resolvePromise();
    }
  });
}
