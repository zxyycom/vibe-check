import type { Check, CheckExecution } from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";

export const PASSED = Object.freeze({
  status: "passed" as const,
  data: Object.freeze({ result: true })
});

export function check(
  overrides: Readonly<{ readonly checkId?: string; readonly execution?: CheckExecution }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED)
  };
}

export function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false } }
  });
}
