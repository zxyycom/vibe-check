import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

import {
  MACHINE_METRICS_V1_SCHEMA,
  MACHINE_METRICS_V1_SCHEMA_ID,
  MACHINE_METRICS_V1_SCHEMA_PATH,
  MACHINE_WARNING_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA_ID,
  MACHINE_WARNING_V1_SCHEMA_PATH,
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  serializeMachineMetricsV1,
  serializeMachineWarningStreamV1,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import type {
  QualityMetrics,
  WarningRecord
} from "../../model/schema.ts";

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

    const expectedPrimary = machineWarning({ ruleId: "first-warning" });
    const expectedAccepted = machineWarning({
      acceptedReason: "Reviewed by the owning team.",
      baselineValue: 8,
      deltaValue: 5,
      isChanged: true,
      line: 17,
      ruleId: "accepted-warning",
      suggestion: "Split the function.",
      value: 13
    });
    assert.deepEqual(projected, {
      aggregates: {
        byCodeArea: [{
          codeArea: "src",
          codeLines: 89,
          cyclomaticComplexity: 7,
          duplicateFragments: 1,
          fileDecisionTokens: 7,
          files: 1,
          functionLines: 13,
          functions: 1,
          lines: 100,
          parameterCount: 2,
          warningPolicy: "strict"
        }],
        byLanguage: [{
          blankLines: 4,
          codeLines: 89,
          commentLines: 7,
          comments: 3,
          files: 1,
          language: "TypeScript",
          lines: 100
        }],
        overall: {
          totalCodeLines: 89,
          totalDuplicateFragments: 1,
          totalFileDecisionTokens: 7,
          totalFiles: 1,
          totalFunctionCyclomaticComplexity: 7,
          totalFunctionLines: 13,
          totalFunctionParameters: 2,
          totalFunctions: 1,
          totalLines: 100
        }
      },
      baseline: {
        commitDate: "2026-07-31T00:00:00.000Z",
        commitSha: "baseline-sha",
        metadata: {
          commitDate: "2026-07-31T00:00:00.000Z",
          commitSha: "baseline-sha",
          commitTitle: "Baseline title",
          configVersion: "test-config-v1",
          selectionReason: "merge-base",
          toolMetadata: [{
            name: "scc",
            source: "configured",
            version: "3.7.0"
          }]
        },
        status: "generated"
      },
      baselineFingerprints: {
        src: {
          fileCount: 1,
          fileList: ["src/example.ts"],
          fingerprint: "baseline-fingerprint"
        }
      },
      comparisonStatus: "compared",
      currentFingerprints: {
        src: {
          fileCount: 1,
          fileList: ["src/example.ts"],
          fingerprint: "current-fingerprint"
        }
      },
      duplicateCode: [{
        codeAreas: ["src", "tests"],
        hitsChangedScope: true,
        id: 4,
        lineCount: 6,
        locations: [{
          codeArea: "src",
          endLine: 15,
          path: "src/example.ts",
          startLine: 10
        }, {
          codeArea: "tests",
          endLine: 25,
          path: "tests/example.test.ts",
          startLine: 20
        }],
        tokenCount: 42
      }],
      fileMetrics: [{
        blankLines: 4,
        codeArea: "src",
        codeLines: 89,
        commentLines: 7,
        decisionTokens: { source: "scc", value: 7 },
        isChanged: true,
        language: "TypeScript",
        lines: 100,
        path: "src/example.ts"
      }],
      functionMetrics: [{
        codeArea: "src",
        cyclomaticComplexity: { source: "lizard", value: 7 },
        endLine: 22,
        file: "src/example.ts",
        isChanged: true,
        lines: 13,
        name: "example",
        parameterCount: 2,
        startLine: 10
      }],
      gate: {
        blockingWarningCount: 1,
        blockingWarnings: [expectedPrimary],
        evaluatedChannel: "all",
        evaluatedWarningCount: 2,
        policy: "all",
        status: "failed"
      },
      metadata: {
        commitDate: "2026-08-01T00:00:00.000Z",
        commitSha: "current-sha",
        commitTitle: "Current title",
        configVersion: "test-config-v1",
        repository: "/workspace/example",
        schemaVersion: "vibe-check.metrics.v1",
        scope: {
          excludeDirs: ["dist"],
          generatedFiles: ["src/generated.ts"],
          include: ["src/**/*.ts"]
        },
        timestamp: "2026-08-03T00:00:00.000Z",
        tools: [{
          name: "scc",
          source: "configured",
          version: "3.7.0"
        }]
      },
      scanCompleteness: {
        capabilities: [{
          capabilityId: "file-metrics",
          status: "succeeded"
        }, {
          capabilityId: "function-metrics",
          status: "no-input"
        }, {
          capabilityId: "duplicate-detection",
          diagnostic: {
            action: "Install jscpd.",
            kind: "unavailable",
            message: "jscpd is unavailable."
          },
          status: "failed"
        }],
        overall: "failed"
      },
      trends: [{
        baseline: 8,
        current: 13,
        delta: 5,
        metric: "cyclomatic-complexity",
        percentChange: 62.5,
        unit: "count"
      }],
      warnings: {
        all: [expectedPrimary, expectedAccepted],
        changed: [expectedAccepted, expectedPrimary],
        regressions: [expectedAccepted]
      }
    });
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
    const metricsSchema = schemaRecord(MACHINE_METRICS_V1_SCHEMA);
    const warningSchema = schemaRecord(MACHINE_WARNING_V1_SCHEMA);
    assert.equal(
      metricsSchema.$schema,
      "https://json-schema.org/draft/2020-12/schema"
    );
    assert.equal(metricsSchema.$id, MACHINE_METRICS_V1_SCHEMA_ID);
    assert.equal(
      MACHINE_METRICS_V1_SCHEMA_PATH,
      "docs/schemas/vibe-check-metrics.schema.json"
    );
    assert.equal(
      warningSchema.$schema,
      "https://json-schema.org/draft/2020-12/schema"
    );
    assert.equal(warningSchema.$id, MACHINE_WARNING_V1_SCHEMA_ID);
    assert.equal(
      MACHINE_WARNING_V1_SCHEMA_PATH,
      "docs/schemas/vibe-check-warning.schema.json"
    );

    const ajv = new Ajv2020({ allErrors: true, strict: true });
    ajv.addSchema(MACHINE_WARNING_V1_SCHEMA);
    assert.doesNotThrow(() => ajv.compile(MACHINE_METRICS_V1_SCHEMA));

    assert.equal(metricsSchema.additionalProperties, false);
    assert.equal(warningSchema.additionalProperties, false);
    assert.deepEqual(
      [...MACHINE_METRICS_V1_SCHEMA.required].sort(),
      [
        "aggregates", "baseline", "comparisonStatus", "currentFingerprints",
        "duplicateCode", "fileMetrics", "functionMetrics", "gate", "metadata",
        "scanCompleteness", "trends", "warnings"
      ].sort()
    );
    assert.deepEqual(
      [...MACHINE_WARNING_V1_SCHEMA.required].sort(),
      [
        "baselineValue", "codeArea", "comparisonBasis", "deltaValue",
        "isChanged", "level", "line", "message", "metric", "path", "ruleId",
        "schemaVersion", "sourceTool", "value"
      ].sort()
    );
    assert.equal(
      MACHINE_WARNING_V1_SCHEMA.properties.schemaVersion.const,
      "vibe-check.warning.v1"
    );
    assert.deepEqual(MACHINE_WARNING_V1_SCHEMA.properties.level.enum, [
      "info", "warning", "error"
    ]);
    assert.deepEqual(
      MACHINE_WARNING_V1_SCHEMA.properties.line.anyOf.map(({ type }) => type),
      ["integer", "null"]
    );
    assert.equal(
      schemaRecord(MACHINE_WARNING_V1_SCHEMA.properties.line.anyOf[0]).minimum,
      1
    );
    assert.deepEqual(
      MACHINE_WARNING_V1_SCHEMA.properties.baselineValue.anyOf.map(
        ({ type }) => type
      ),
      ["number", "null"]
    );
    assert.equal(MACHINE_WARNING_V1_SCHEMA.properties.value.type, "number");
    assert.equal(
      Object.hasOwn(MACHINE_WARNING_V1_SCHEMA.properties, "acceptedReason"),
      true
    );
    assert.equal(
      (MACHINE_WARNING_V1_SCHEMA.required as readonly string[]).includes(
        "acceptedReason"
      ),
      false
    );

    const fingerprintMap = schemaRecord(
      MACHINE_METRICS_V1_SCHEMA.properties.currentFingerprints
    );
    const fingerprintValue = schemaRecord(fingerprintMap.additionalProperties);
    assert.match(String(fingerprintMap.description), /dynamic map/i);
    assert.equal(fingerprintValue.type, "object");
    assert.equal(fingerprintValue.additionalProperties, false);
    assert.ok(
      collectSchemaRefs(MACHINE_METRICS_V1_SCHEMA).filter(
        (reference) => reference === MACHINE_WARNING_V1_SCHEMA_ID
      ).length >= 4
    );

    for (const schema of [
      MACHINE_METRICS_V1_SCHEMA,
      MACHINE_WARNING_V1_SCHEMA
    ]) {
      for (const objectSchema of collectTypedSchemaNodes(schema, "object")) {
        if (objectSchema.additionalProperties !== false) {
          assert.match(String(objectSchema.description), /dynamic map/i);
          assert.equal(isRecord(objectSchema.additionalProperties), true);
          continue;
        }
        assert.equal(objectSchema.additionalProperties, false);
      }
      for (const arraySchema of collectTypedSchemaNodes(schema, "array")) {
        assert.match(String(arraySchema.description), /order/i);
      }
      for (const propertySchema of collectPropertySchemas(schema)) {
        assert.equal(typeof propertySchema.description, "string");
        assert.ok(String(propertySchema.description).length > 0);
      }
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

function coreWarning({
  acceptedReason,
  baselineValue = null,
  deltaValue = null,
  isChanged = false,
  line = null,
  privateSourceState,
  ruleId,
  suggestion,
  value = 7
}: {
  acceptedReason?: string;
  baselineValue?: number | null;
  deltaValue?: number | null;
  isChanged?: boolean;
  line?: number | null;
  privateSourceState?: string;
  ruleId: string;
  suggestion?: string;
  value?: number;
}): WarningRecord & { privateSourceState?: string } {
  return {
    ...(acceptedReason === undefined ? {} : { acceptedReason }),
    baselineValue,
    codeArea: "src",
    comparisonBasis: "absolute",
    deltaValue,
    isChanged,
    level: "warning",
    line,
    message: "Example warning.",
    metric: "cyclomatic-complexity",
    path: "src/example.ts",
    ...(privateSourceState === undefined ? {} : { privateSourceState }),
    ruleId,
    sourceTool: "lizard",
    ...(suggestion === undefined ? {} : { suggestion }),
    value
  };
}

function machineWarning({
  acceptedReason,
  baselineValue = null,
  deltaValue = null,
  isChanged = false,
  line = null,
  ruleId,
  suggestion,
  value = 7
}: {
  acceptedReason?: string;
  baselineValue?: number | null;
  deltaValue?: number | null;
  isChanged?: boolean;
  line?: number | null;
  ruleId: string;
  suggestion?: string;
  value?: number;
}): MachineWarningV1 {
  return {
    ...(acceptedReason === undefined ? {} : { acceptedReason }),
    baselineValue,
    codeArea: "src",
    comparisonBasis: "absolute",
    deltaValue,
    isChanged,
    level: "warning",
    line,
    message: "Example warning.",
    metric: "cyclomatic-complexity",
    path: "src/example.ts",
    ruleId,
    schemaVersion: "vibe-check.warning.v1",
    sourceTool: "lizard",
    ...(suggestion === undefined ? {} : { suggestion }),
    value
  };
}

function richCoreMetrics(
  primaryWarning: WarningRecord,
  acceptedWarning: WarningRecord
): QualityMetrics & {
  metadata: QualityMetrics["metadata"] & { privateMetadataState: string };
  privateMetricsState: string;
} {
  return {
    aggregates: {
      byCodeArea: [{
        codeArea: "src",
        codeLines: 89,
        cyclomaticComplexity: 7,
        duplicateFragments: 1,
        fileDecisionTokens: 7,
        files: 1,
        functionLines: 13,
        functions: 1,
        lines: 100,
        parameterCount: 2,
        warningPolicy: "strict"
      }],
      byLanguage: [{
        blankLines: 4,
        codeLines: 89,
        commentLines: 7,
        comments: 3,
        files: 1,
        language: "TypeScript",
        lines: 100
      }],
      overall: {
        totalCodeLines: 89,
        totalDuplicateFragments: 1,
        totalFileDecisionTokens: 7,
        totalFiles: 1,
        totalFunctionCyclomaticComplexity: 7,
        totalFunctionLines: 13,
        totalFunctionParameters: 2,
        totalFunctions: 1,
        totalLines: 100
      }
    },
    baseline: {
      commitDate: "2026-07-31T00:00:00.000Z",
      commitSha: "baseline-sha",
      metadata: {
        commitDate: "2026-07-31T00:00:00.000Z",
        commitSha: "baseline-sha",
        commitTitle: "Baseline title",
        configVersion: "test-config-v1",
        selectionReason: "merge-base",
        toolMetadata: [{
          name: "scc",
          source: "configured",
          version: "3.7.0"
        }]
      },
      status: "generated"
    },
    baselineFingerprints: {
      src: {
        fileCount: 1,
        fileList: ["src/example.ts"],
        fingerprint: "baseline-fingerprint"
      }
    },
    comparisonStatus: "compared",
    currentFingerprints: {
      src: {
        fileCount: 1,
        fileList: ["src/example.ts"],
        fingerprint: "current-fingerprint"
      }
    },
    duplicateCode: [{
      codeAreas: ["src", "tests"],
      hitsChangedScope: true,
      id: 4,
      lineCount: 6,
      locations: [{
        codeArea: "src",
        endLine: 15,
        path: "src/example.ts",
        startLine: 10
      }, {
        codeArea: "tests",
        endLine: 25,
        path: "tests/example.test.ts",
        startLine: 20
      }],
      tokenCount: 42
    }],
    fileMetrics: [{
      blankLines: 4,
      codeArea: "src",
      codeLines: 89,
      commentLines: 7,
      decisionTokens: { source: "scc", value: 7 },
      isChanged: true,
      language: "TypeScript",
      lines: 100,
      path: "src/example.ts"
    }],
    functionMetrics: [{
      codeArea: "src",
      cyclomaticComplexity: { source: "lizard", value: 7 },
      endLine: 22,
      file: "src/example.ts",
      isChanged: true,
      lines: 13,
      name: "example",
      parameterCount: 2,
      startLine: 10
    }],
    gate: {
      blockingWarningCount: 1,
      blockingWarnings: [primaryWarning],
      evaluatedChannel: "all",
      evaluatedWarningCount: 2,
      policy: "all",
      status: "failed"
    },
    metadata: {
      commitDate: "2026-08-01T00:00:00.000Z",
      commitSha: "current-sha",
      commitTitle: "Current title",
      configVersion: "test-config-v1",
      repository: "/workspace/example",
      schemaVersion: "0.4.0",
      scope: {
        excludeDirs: ["dist"],
        generatedFiles: ["src/generated.ts"],
        include: ["src/**/*.ts"]
      },
      timestamp: "2026-08-03T00:00:00.000Z",
      tools: [{
        name: "scc",
        source: "configured",
        version: "3.7.0"
      }],
      privateMetadataState: "must not cross the transport boundary"
    },
    privateMetricsState: "must not cross the transport boundary",
    scanCompleteness: {
      capabilities: [{
        capabilityId: "file-metrics",
        status: "succeeded"
      }, {
        capabilityId: "function-metrics",
        status: "no-input"
      }, {
        capabilityId: "duplicate-detection",
        diagnostic: {
          action: "Install jscpd.",
          kind: "unavailable",
          message: "jscpd is unavailable."
        },
        status: "failed"
      }],
      overall: "failed"
    },
    trends: [{
      baseline: 8,
      current: 13,
      delta: 5,
      metric: "cyclomatic-complexity",
      percentChange: 62.5,
      unit: "count"
    }],
    warnings: {
      all: [primaryWarning, acceptedWarning],
      changed: [acceptedWarning, primaryWarning],
      regressions: [acceptedWarning]
    }
  };
}

function collectSchemaRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSchemaRefs(item));
  }
  if (!isRecord(value)) return [];
  return [
    ...(typeof value.$ref === "string" ? [value.$ref] : []),
    ...Object.values(value).flatMap((item) => collectSchemaRefs(item))
  ];
}

function collectTypedSchemaNodes(
  value: unknown,
  type: "array" | "object"
): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTypedSchemaNodes(item, type));
  }
  if (!isRecord(value)) return [];
  return [
    ...(value.type === type ? [value] : []),
    ...Object.values(value).flatMap((item) =>
      collectTypedSchemaNodes(item, type)
    )
  ];
}

function collectPropertySchemas(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPropertySchemas(item));
  }
  if (!isRecord(value)) return [];
  const direct = isRecord(value.properties)
    ? Object.values(value.properties).filter(isRecord)
    : [];
  return [
    ...direct,
    ...Object.values(value).flatMap((item) => collectPropertySchemas(item))
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError("Expected a JSON Schema object.");
  }
  return value;
}
