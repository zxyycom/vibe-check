// #region package-api-example:custom-check-run
import { defineCheck, defineConfig, run } from "vibe-check";

// #region package-api-example:custom-check-definition
function hasValidLicensePolicyOptions(options: object): boolean {
  const denied: unknown = Reflect.get(options, "denied");
  return (
    Object.keys(options).length === 1 &&
    Object.hasOwn(options, "denied") &&
    Array.isArray(denied) &&
    denied.every((license) => typeof license === "string")
  );
}

const licensePolicy = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
  preflight(options) {
    return hasValidLicensePolicyOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } };
  },
  visibility: "attention",
  execution({ options, records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };

    const deniedCount = options.denied.length;
    if (deniedCount > 0) {
      records.report({ id: "denied-license" }, { count: deniedCount });
      return {
        status: "failed",
        data: { deniedCount },
        messages: [{ level: "warning", code: "denied-license", message: "Denied licenses found." }]
      };
    }
    return { status: "passed", data: { deniedCount: 0 } };
  }
});
// #endregion package-api-example:custom-check-definition

const definition = defineConfig({
  checks: [licensePolicy],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition, {
  checkAggregation: {
    checks: "all",
    mode: "all",
    unavailable: "propagate",
    notApplicable: "exclude",
    empty: "passed"
  }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
if (result.aggregate !== "failed") throw new Error("Expected the selected Checks to fail");
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === licensePolicy.checkId
)?.outcome;
if (outcome?.status !== "failed" || outcome.data.deniedCount !== 1) {
  throw new Error("License policy did not produce the expected failed outcome");
}
// #endregion package-api-example:custom-check-run
