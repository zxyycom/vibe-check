// #region package-api-example:custom-check-run
import { defineCheck, defineConfig, run } from "vibe-check";

// #region package-api-example:custom-check-definition
const licensePolicy = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
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
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
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
// #endregion package-api-example:custom-check-run
