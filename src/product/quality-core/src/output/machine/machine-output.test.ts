import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  coreWarning,
  richCoreMetrics
} from "./machine-output.fixtures.ts";
import {
  EXPECTED_RICH_MACHINE_METRICS
} from "./machine-output-expected.fixtures.ts";
import {
  assertMachineFingerprintSchemaAndWarningRefs,
  assertMachineSchemaDescriptions,
  assertMachineSchemaFieldConstraints,
  assertMachineSchemaIdentityAndCompilation
} from "./machine-output-schema.test-support.ts";

import {
  MACHINE_METRICS_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA,
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  serializeMachineMetricsV1,
  serializeMachineWarningStreamV1,
  type MachineWarningV1
} from "../../../../machine-output.ts";

describe("machine output v1 contract", () => {
  it("projects the exact public field set through one warning mapper", () => {
    const primaryWarning = coreWarning({
      ruleId: "first-warning",
      privateSourceState: "must not cross the transport boundary"
    });
    const acceptedWarning = coreWarning({
      acceptedReason: "Reviewed by the owning team.",
      baselineValue: 8,
      deltaValue: 5,
      isChanged: true,
      line: 17,
      ruleId: "accepted-warning",
      suggestion: "Split the function.",
      value: 13,
      privateSourceState: "also private"
    });
    const coreMetrics = richCoreMetrics(primaryWarning, acceptedWarning);

    const projected = projectMachineMetricsV1(coreMetrics);

    assert.deepEqual(projected, EXPECTED_RICH_MACHINE_METRICS);
    assert.equal(Object.hasOwn(projected, "privateMetricsState"), false);
    assert.equal(Object.hasOwn(projected.metadata, "privateMetadataState"), false);
    assert.equal(
      Object.hasOwn(projected.warnings.all[0]!, "privateSourceState"),
      false
    );
    assert.equal(Object.hasOwn(primaryWarning, "schemaVersion"), false);
    assert.equal(coreMetrics.metadata.schemaVersion, "0.4.0");

    const sparseCoreMetrics = richCoreMetrics(primaryWarning, acceptedWarning);
    delete sparseCoreMetrics.baselineFingerprints;
    sparseCoreMetrics.baseline.commitDate = null;
    sparseCoreMetrics.baseline.commitSha = null;
    sparseCoreMetrics.baseline.metadata = null;
    delete sparseCoreMetrics.metadata.commitDate;
    delete sparseCoreMetrics.fileMetrics[0]!.blankLines;
    delete sparseCoreMetrics.fileMetrics[0]!.codeLines;
    delete sparseCoreMetrics.fileMetrics[0]!.commentLines;
    delete sparseCoreMetrics.aggregates.byLanguage[0]!.comments;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.codeLines;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.cyclomaticComplexity;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.duplicateFragments;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.fileDecisionTokens;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.functionLines;
    delete sparseCoreMetrics.aggregates.byCodeArea[0]!.parameterCount;
    delete sparseCoreMetrics.aggregates.overall.totalDuplicateFragments;
    delete sparseCoreMetrics.aggregates.overall.totalFileDecisionTokens;
    delete sparseCoreMetrics.aggregates.overall
      .totalFunctionCyclomaticComplexity;
    delete sparseCoreMetrics.aggregates.overall.totalFunctionLines;
    delete sparseCoreMetrics.aggregates.overall.totalFunctionParameters;
    sparseCoreMetrics.warnings = {
      all: [primaryWarning],
      changed: [primaryWarning],
      regressions: [primaryWarning]
    };
    sparseCoreMetrics.gate = {
      blockingWarningCount: 1,
      blockingWarnings: [primaryWarning],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "failed"
    };

    const sparseProjected = projectMachineMetricsV1(sparseCoreMetrics);
    assert.equal(Object.hasOwn(sparseProjected, "baselineFingerprints"), false);
    assert.equal(sparseProjected.baseline.metadata, null);
    assert.equal(Object.hasOwn(sparseProjected.metadata, "commitDate"), false);
    for (const field of ["blankLines", "codeLines", "commentLines"]) {
      assert.equal(Object.hasOwn(sparseProjected.fileMetrics[0]!, field), false);
    }
    assert.equal(
      Object.hasOwn(sparseProjected.aggregates.byLanguage[0]!, "comments"),
      false
    );
    for (const field of [
      "codeLines", "cyclomaticComplexity", "duplicateFragments",
      "fileDecisionTokens", "functionLines", "parameterCount"
    ]) {
      assert.equal(
        Object.hasOwn(sparseProjected.aggregates.byCodeArea[0]!, field),
        false
      );
    }
    for (const field of [
      "totalDuplicateFragments", "totalFileDecisionTokens",
      "totalFunctionCyclomaticComplexity", "totalFunctionLines",
      "totalFunctionParameters"
    ]) {
      assert.equal(
        Object.hasOwn(sparseProjected.aggregates.overall, field),
        false
      );
    }
    assert.equal(
      Object.hasOwn(sparseProjected.warnings.all[0]!, "acceptedReason"),
      false
    );
    assert.equal(
      Object.hasOwn(sparseProjected.warnings.all[0]!, "suggestion"),
      false
    );
  });

  it("authors the complete runtime schema contract", () => {
    assertMachineSchemaIdentityAndCompilation();
    assertMachineSchemaFieldConstraints();
    assertMachineFingerprintSchemaAndWarningRefs();
    for (const schema of [
      MACHINE_METRICS_V1_SCHEMA,
      MACHINE_WARNING_V1_SCHEMA
    ]) {
      assertMachineSchemaDescriptions(schema);
    }
  });

  it("serializes deterministic metrics and warning stream matrices", () => {
    const dto = projectMachineMetricsV1(
      richCoreMetrics(
        coreWarning({ ruleId: "first-warning" }),
        coreWarning({ acceptedReason: "accepted", ruleId: "second-warning" })
      )
    );
    const warningCases: ReadonlyArray<{
      expected: string;
      input: readonly MachineWarningV1[];
      label: string;
    }> = [{
      expected: "",
      input: [],
      label: "empty"
    }, {
      expected: `${JSON.stringify(dto.warnings.all[0])}\n`,
      input: dto.warnings.all.slice(0, 1),
      label: "single"
    }, {
      expected: `${dto.warnings.all.map((warning) => JSON.stringify(warning)).join("\n")}\n`,
      input: dto.warnings.all,
      label: "multiple"
    }];

    const metricsJson = serializeMachineMetricsV1(dto);
    assert.equal(metricsJson, JSON.stringify(dto, null, 2));
    assert.equal(metricsJson.endsWith("\n"), false);
    for (const testCase of warningCases) {
      assert.equal(
        serializeMachineWarningStreamV1(testCase.input),
        testCase.expected,
        testCase.label
      );
    }

    const candidates = serializeMachineArtifactCandidatesV1(dto);
    assert.deepEqual(candidates, {
      metricsJson,
      warningsAllNdjson: serializeMachineWarningStreamV1(dto.warnings.all),
      warningsNdjson: serializeMachineWarningStreamV1(dto.warnings.changed)
    });
  });
});
