import Type from "typebox";

export const MACHINE_METRICS_V1_SCHEMA_ID =
  "urn:vibe-check:schema:metrics:v1";
export const MACHINE_WARNING_V1_SCHEMA_ID =
  "urn:vibe-check:schema:warning:v1";
export const MACHINE_METRICS_V1_IDENTITY = "vibe-check.metrics.v1";
export const MACHINE_WARNING_V1_IDENTITY = "vibe-check.warning.v1";
export const MACHINE_METRICS_V1_SCHEMA_PATH =
  "docs/schemas/vibe-check-metrics.schema.json";
export const MACHINE_WARNING_V1_SCHEMA_PATH =
  "docs/schemas/vibe-check-warning.schema.json";

export const MACHINE_WARNING_V1_SCHEMA = Type.Object({
  acceptedReason: Type.Optional(Type.String({
    description:
      "Optional owner-supplied acceptance reason. An absent or empty value remains blocking for gate evaluation."
  })),
  baselineValue: Type.Union([Type.Number(), Type.Null()], {
    description:
      "Baseline value in the unit named by metric semantics, or null when no comparable baseline value exists."
  }),
  codeArea: Type.String({
    description: "Vibe Check code-area identifier associated with the warning.",
    minLength: 1
  }),
  comparisonBasis: Type.String({
    description:
      "Producer-owned explanation of the threshold or comparison basis used for this warning.",
    minLength: 1
  }),
  deltaValue: Type.Union([Type.Number(), Type.Null()], {
    description:
      "Current-minus-baseline delta in the warning metric unit, or null when no comparable delta exists."
  }),
  isChanged: Type.Boolean({
    description: "Whether the warning is associated with the invocation's changed-file scope."
  }),
  level: Type.Enum(["info", "warning", "error"], {
    description: "Closed warning severity used by machine consumers.",
    type: "string"
  }),
  line: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()], {
    description:
      "One-based source line within path, or null when the warning applies without a single line."
  }),
  message: Type.String({
    description: "Human-readable normalized warning statement.",
    minLength: 1
  }),
  metric: Type.String({
    description: "Stable normalized metric identifier evaluated by the warning rule.",
    minLength: 1
  }),
  path: Type.String({
    description:
      "Product-normalized project-relative path using forward slashes; never an absolute host path.",
    minLength: 1
  }),
  ruleId: Type.String({
    description: "Stable normalized warning-rule identifier.",
    minLength: 1
  }),
  schemaVersion: Type.Literal(MACHINE_WARNING_V1_IDENTITY, {
    description: "Current machine warning instance identity."
  }),
  sourceTool: Type.String({
    description: "Normalized name of the measurement source that supports the warning.",
    minLength: 1
  }),
  suggestion: Type.Optional(Type.String({
    description: "Optional human-readable remediation suggestion."
  })),
  value: Type.Number({
    description: "Current observed value in the unit named by metric semantics."
  })
}, {
  $id: MACHINE_WARNING_V1_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  description:
    "One normalized quality warning. Object member order has no instance meaning.",
  title: "Vibe Check machine warning v1"
});

const ToolInfoSchema = Type.Object({
  name: Type.String({
    description: "Normalized tool name.",
    minLength: 1
  }),
  source: Type.String({
    description: "Producer-owned description of how the tool was resolved.",
    minLength: 1
  }),
  version: Type.String({
    description: "Normalized reported tool version.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized identity and version for one measurement tool."
});

const ScopeSchema = Type.Object({
  excludeDirs: Type.Array(Type.String({
    description: "Configured excluded directory name or path."
  }), {
    description:
      "Configured excluded directory names or paths. Order is configuration semantic and preserved from resolved config."
  }),
  generatedFiles: Type.Array(Type.String({
    description: "Configured generated-file glob."
  }), {
    description:
      "Configured generated-file globs. Order is configuration semantic and preserved from resolved config."
  }),
  include: Type.Array(Type.String({
    description: "Configured include glob."
  }), {
    description:
      "Configured include globs. Order is configuration semantic and preserved from resolved config."
  })
}, {
  additionalProperties: false,
  description: "Resolved scan-scope configuration values."
});

const MetadataSchema = Type.Object({
  commitDate: Type.Optional(Type.String({
    description: "Optional current commit UTC timestamp when repository metadata provides it."
  })),
  commitSha: Type.String({
    description: "Current repository commit identifier used for the invocation.",
    minLength: 1
  }),
  commitTitle: Type.Union([Type.String(), Type.Null()], {
    description: "Current commit title, or null when unavailable."
  }),
  configVersion: Type.String({
    description: "Quality configuration version used for the invocation.",
    minLength: 1
  }),
  repository: Type.String({
    description:
      "Normalized absolute project root used by this invocation; this is host context, not a portable repository identity.",
    minLength: 1
  }),
    schemaVersion: Type.Literal(MACHINE_METRICS_V1_IDENTITY, {
    description: "Current machine metrics instance identity."
  }),
  scope: Type.Object(ScopeSchema.properties, {
    additionalProperties: false,
    description: "Resolved include/exclude/generated scope configuration."
  }),
  timestamp: Type.String({
    description: "UTC invocation instant in ISO-8601 form with millisecond precision.",
    pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$"
  }),
  tools: Type.Array(ToolInfoSchema, {
    description:
      "Normalized current tool metadata. Order is presentation-only; consumers identify entries by name."
  })
}, {
  additionalProperties: false,
  description: "Current invocation metadata and machine metrics identity."
});

const CodeAreaFingerprintSchema = Type.Object({
  fileCount: Type.Integer({
    description: "Number of project-relative files included in this fingerprint.",
    minimum: 0
  }),
  fileList: Type.Array(Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  }), {
    description:
      "Product-normalized project-relative file paths. Order is semantic because it participates in deterministic fingerprint evidence."
  }),
  fingerprint: Type.String({
    description: "Opaque deterministic fingerprint value owned by Product Core.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "Deterministic normalized input fingerprint for one code area."
});

// Type.Record provides the desired Record<string, T> static type. The current
// public contract intentionally publishes that same value shape through the
// draft-2020-12 `additionalProperties` keyword rather than pattern matching.
const FingerprintMapSchema = Object.assign(
  Type.Record(Type.String(), CodeAreaFingerprintSchema, {
    description:
      "Dynamic map whose property names are Vibe Check code-area IDs and whose values are normalized fingerprints."
  }),
  { additionalProperties: CodeAreaFingerprintSchema }
);
Reflect.deleteProperty(FingerprintMapSchema, "patternProperties");
const BaselineFingerprintMapSchema = Object.assign(
  Type.Optional(FingerprintMapSchema),
  {
    description:
      "Optional dynamic map of baseline code-area IDs to their input fingerprints; absent when no baseline fingerprints were produced."
  }
);

const BaselineMetadataSchema = Type.Object({
  commitDate: Type.Union([Type.String(), Type.Null()], {
    description: "Selected baseline commit UTC timestamp, or null when unavailable."
  }),
  commitSha: Type.String({
    description: "Selected baseline commit identifier.",
    minLength: 1
  }),
  commitTitle: Type.Union([Type.String(), Type.Null()], {
    description: "Selected baseline commit title, or null when unavailable."
  }),
  configVersion: Type.String({
    description: "Quality configuration version used for the baseline scan.",
    minLength: 1
  }),
  selectionReason: Type.String({
    description: "Producer-owned explanation of how the baseline commit was selected.",
    minLength: 1
  }),
  toolMetadata: Type.Array(ToolInfoSchema, {
    description:
      "Normalized baseline tool metadata. Order is presentation-only; consumers identify entries by name."
  })
}, {
  additionalProperties: false,
  description: "Normalized metadata for the selected baseline scan."
});

const BaselineSchema = Type.Object({
  commitDate: Type.Union([Type.String(), Type.Null()], {
    description: "Baseline commit UTC timestamp, or null when no baseline commit was selected."
  }),
  commitSha: Type.Union([Type.String(), Type.Null()], {
    description: "Baseline commit identifier, or null when no baseline commit was selected."
  }),
  metadata: Type.Union([BaselineMetadataSchema, Type.Null()], {
    description:
      "Normalized selected-baseline metadata, or null when baseline materialization did not produce it."
  }),
  status: Type.Enum([
    "generated",
    "baseline-skipped",
    "history-unavailable",
    "no-baseline-commit",
    "baseline-materialization-failed",
    "baseline-scan-failed"
  ], {
    description: "Closed baseline selection/materialization status.",
    type: "string"
  })
}, {
  additionalProperties: false,
  description: "Baseline availability, identity, and optional normalized metadata."
});

const MetricValueSchema = Type.Object({
  source: Type.String({
    description: "Normalized measurement source name.",
    minLength: 1
  }),
  value: Type.Union([Type.Number(), Type.Null()], {
    description: "Observed numeric value, or null when the source could not provide one."
  })
}, {
  additionalProperties: false,
  description: "One normalized numeric measurement and its source."
});

const FileMetricSchema = Type.Object({
  blankLines: Type.Optional(Type.Integer({
    description: "Optional blank physical-line count reported by the file scanner.",
    minimum: 0
  })),
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this file.",
    minLength: 1
  }),
  codeLines: Type.Optional(Type.Integer({
    description: "Optional non-comment, non-blank code-line count reported by the file scanner.",
    minimum: 0
  })),
  commentLines: Type.Optional(Type.Integer({
    description: "Optional comment physical-line count reported by the file scanner.",
    minimum: 0
  })),
  decisionTokens: Type.Object(MetricValueSchema.properties, {
    additionalProperties: false,
    description: "scc decision-token count and normalized source for this file."
  }),
  isChanged: Type.Boolean({
    description: "Whether path is included in the invocation's changed-file scope."
  }),
  language: Type.String({
    description: "Normalized source language name reported for this file.",
    minLength: 1
  }),
  lines: Type.Integer({
    description: "Total physical lines in this file.",
    minimum: 0
  }),
  path: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized current measurements for one project-relative file."
});

const FunctionMetricSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this function.",
    minLength: 1
  }),
  cyclomaticComplexity: Type.Object(MetricValueSchema.properties, {
    additionalProperties: false,
    description: "Cyclomatic-complexity count and normalized source for this function."
  }),
  endLine: Type.Integer({
    description: "One-based inclusive function end line within file.",
    minimum: 1
  }),
  file: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  }),
  isChanged: Type.Boolean({
    description: "Whether file is included in the invocation's changed-file scope."
  }),
  lines: Type.Integer({
    description: "Normalized function code-line count.",
    minimum: 0
  }),
  name: Type.String({
    description: "Normalized function name reported by the function scanner."
  }),
  parameterCount: Type.Integer({
    description: "Function parameter count.",
    minimum: 0
  }),
  startLine: Type.Integer({
    description: "One-based inclusive function start line within file.",
    minimum: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized current measurements for one source function."
});

const DuplicateCodeLocationSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this location.",
    minLength: 1
  }),
  endLine: Type.Integer({
    description: "One-based inclusive end line in path.",
    minimum: 1
  }),
  path: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  }),
  startLine: Type.Integer({
    description: "One-based inclusive start line in path.",
    minimum: 1
  })
}, {
  additionalProperties: false,
  description: "One normalized project-relative duplicate location."
});

const DuplicateCodeFragmentSchema = Type.Object({
  codeAreas: Type.Array(Type.String({
    description: "Vibe Check code-area identifier.",
    minLength: 1
  }), {
    description:
      "Code areas touched by the fragment. Order is producer semantic and preserved from duplicate normalization."
  }),
  hitsChangedScope: Type.Boolean({
    description: "Whether any duplicate location intersects the changed-file scope."
  }),
  id: Type.Integer({
    description: "Producer-assigned duplicate-fragment numeric identifier.",
    minimum: 0
  }),
  lineCount: Type.Integer({
    description: "Normalized duplicated line count per fragment occurrence.",
    minimum: 0
  }),
  locations: Type.Array(DuplicateCodeLocationSchema, {
    description:
      "Normalized source locations for the fragment. Order is semantic and preserved from duplicate normalization."
  }),
  tokenCount: Type.Integer({
    description: "Normalized duplicate token count per fragment occurrence.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "One normalized duplicate-code fragment and its source locations."
});

const LanguageAggregateSchema = Type.Object({
  blankLines: Type.Integer({
    description: "Total blank physical lines for this language.",
    minimum: 0
  }),
  codeLines: Type.Integer({
    description: "Total non-comment, non-blank code lines for this language.",
    minimum: 0
  }),
  commentLines: Type.Integer({
    description: "Total comment physical lines for this language.",
    minimum: 0
  }),
  comments: Type.Optional(Type.Integer({
    description: "Optional scanner-provided comment count distinct from comment lines.",
    minimum: 0
  })),
  files: Type.Integer({
    description: "Number of measured files for this language.",
    minimum: 0
  }),
  language: Type.String({
    description: "Normalized language name.",
    minLength: 1
  }),
  lines: Type.Integer({
    description: "Total physical lines for this language.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "Aggregate file measurements for one normalized language."
});

const CodeAreaAggregateSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier.",
    minLength: 1
  }),
  codeLines: Type.Optional(Type.Integer({
    description: "Optional total non-comment, non-blank code lines in this code area.",
    minimum: 0
  })),
  cyclomaticComplexity: Type.Optional(Type.Number({
    description: "Optional sum of function cyclomatic-complexity counts in this code area.",
    minimum: 0
  })),
  duplicateFragments: Type.Optional(Type.Integer({
    description: "Optional duplicate-fragment count associated with this code area.",
    minimum: 0
  })),
  fileDecisionTokens: Type.Optional(Type.Number({
    description: "Optional sum of scc decision-token counts in this code area.",
    minimum: 0
  })),
  files: Type.Integer({
    description: "Number of measured files in this code area.",
    minimum: 0
  }),
  functionLines: Type.Optional(Type.Number({
    description: "Optional sum of normalized function code lines in this code area.",
    minimum: 0
  })),
  functions: Type.Integer({
    description: "Number of measured functions in this code area.",
    minimum: 0
  }),
  lines: Type.Integer({
    description: "Total physical lines in measured files for this code area.",
    minimum: 0
  }),
  parameterCount: Type.Optional(Type.Number({
    description: "Optional sum of function parameter counts in this code area.",
    minimum: 0
  })),
  warningPolicy: Type.Enum([
    "strict",
    "moderate",
    "relaxed",
    "watchlist-only",
    "exclude-warnings"
  ], {
    description: "Closed warning policy applied to this code area.",
    type: "string"
  })
}, {
  additionalProperties: false,
  description: "Aggregate measurements for one Vibe Check code area."
});

const OverallAggregateSchema = Type.Object({
  totalCodeLines: Type.Integer({
    description: "Total non-comment, non-blank code lines.",
    minimum: 0
  }),
  totalDuplicateFragments: Type.Optional(Type.Integer({
    description: "Optional total normalized duplicate-fragment count.",
    minimum: 0
  })),
  totalFileDecisionTokens: Type.Optional(Type.Number({
    description: "Optional total scc decision-token count.",
    minimum: 0
  })),
  totalFiles: Type.Integer({
    description: "Total measured file count.",
    minimum: 0
  }),
  totalFunctionCyclomaticComplexity: Type.Optional(Type.Number({
    description: "Optional sum of function cyclomatic-complexity counts.",
    minimum: 0
  })),
  totalFunctionLines: Type.Optional(Type.Number({
    description: "Optional sum of normalized function code lines.",
    minimum: 0
  })),
  totalFunctionParameters: Type.Optional(Type.Number({
    description: "Optional sum of function parameter counts.",
    minimum: 0
  })),
  totalFunctions: Type.Integer({
    description: "Total measured function count.",
    minimum: 0
  }),
  totalLines: Type.Integer({
    description: "Total physical line count.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "Totals across all eligible current measurements."
});

const AggregateMetricsSchema = Type.Object({
  byCodeArea: Type.Array(CodeAreaAggregateSchema, {
    description:
      "Aggregates by code-area ID. Order is presentation-only; consumers identify entries by codeArea."
  }),
  byLanguage: Type.Array(LanguageAggregateSchema, {
    description:
      "Aggregates by normalized language name. Order is presentation-only; consumers identify entries by language."
  }),
  overall: Type.Object(OverallAggregateSchema.properties, {
    additionalProperties: false,
    description: "Totals across all eligible current measurement inputs."
  })
}, {
  additionalProperties: false,
  description: "Current aggregate measurement groups."
});

const TrendDeltaSchema = Type.Object({
  baseline: Type.Union([Type.Number(), Type.Null()], {
    description: "Baseline value in unit, or null when unavailable."
  }),
  current: Type.Union([Type.Number(), Type.Null()], {
    description: "Current value in unit, or null when unavailable."
  }),
  delta: Type.Union([Type.Number(), Type.Null()], {
    description: "Current-minus-baseline value in unit, or null when unavailable."
  }),
  metric: Type.String({
    description: "Stable normalized metric identifier.",
    minLength: 1
  }),
  percentChange: Type.Union([Type.Number(), Type.Null()], {
    description: "Percentage change from baseline, or null when not computable."
  }),
  unit: Type.String({
    description: "Normalized unit label for baseline, current, and delta values.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "One normalized current-to-baseline metric delta."
});

const CapabilityDiagnosticSchema = Type.Object({
  action: Type.String({
    description: "Action the owning operator can take to restore the capability.",
    minLength: 1
  }),
  kind: Type.Enum(["unavailable", "execution", "invalid-result"], {
    description: "Closed normalized capability failure category.",
    type: "string"
  }),
  message: Type.String({
    description: "Human-readable normalized capability failure message.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized failure reason and owner action for one failed capability."
});

const CapabilityIdSchema = Type.Enum([
  "file-metrics",
  "function-metrics",
  "duplicate-detection"
], {
  description: "Stable measurement capability identifier.",
  type: "string"
});

const CapabilityResultSchema = Type.Union([
  Type.Object({
    capabilityId: CapabilityIdSchema,
    status: Type.Literal("skipped", {
      description: "The resolved profile did not request this capability."
    })
  }, { additionalProperties: false }),
  Type.Object({
    capabilityId: CapabilityIdSchema,
    status: Type.Literal("no-input", {
      description: "The capability had no eligible current input."
    })
  }, { additionalProperties: false }),
  Type.Object({
    capabilityId: CapabilityIdSchema,
    status: Type.Literal("succeeded", {
      description: "Eligible current measurement completed successfully."
    })
  }, { additionalProperties: false }),
  Type.Object({
    capabilityId: CapabilityIdSchema,
    diagnostic: CapabilityDiagnosticSchema,
    status: Type.Literal("failed", {
      description: "Required eligible current measurement did not complete."
    })
  }, { additionalProperties: false })
], {
  description: "One stable measurement capability result."
});

const ScanCompletenessSchema = Type.Object({
  capabilities: Type.Array(CapabilityResultSchema, {
    description:
      "Exactly one result per stable capability ID. Array order is not semantic; consumers identify members by capabilityId."
  }),
  overall: Type.Enum(["complete", "empty", "failed"], {
    description: "Closed shared reduction of current capability results.",
    type: "string"
  })
}, {
  additionalProperties: false,
  description: "Final capability results and shared overall completeness reduction."
});

const WarningReferenceSchema = Type.Ref(MACHINE_WARNING_V1_SCHEMA_ID);
const WarningChannelsSchema = Type.Object({
  all: Type.Array(WarningReferenceSchema, {
    description:
      "All normalized warnings. Order is semantic and is the reference order for channel subsequences and consumers."
  }),
  changed: Type.Array(WarningReferenceSchema, {
    description:
      "Warnings associated with changed code. Order is semantic and preserves their order from all."
  }),
  regressions: Type.Array(WarningReferenceSchema, {
    description:
      "Changed warnings that regress from baseline. Order is semantic and preserves their order from changed."
  })
}, {
  additionalProperties: false,
  description: "Final normalized warnings partitioned into ordered semantic channels."
});

const GatePolicySchema = Type.Enum(["all", "changed", "regressions"], {
  description: "Requested gate policy.",
  type: "string"
});
const EvaluatedChannelSchema = Type.Enum(["all", "changed", "regressions"], {
  description: "Warning channel selected by the requested gate policy.",
  type: "string"
});

const GateResultSchema = Type.Union([
  Type.Object({
    policy: Type.Null({ description: "No policy was requested." }),
    status: Type.Literal("disabled", {
      description: "Gate evaluation was not requested."
    })
  }, { additionalProperties: false }),
  Type.Object({
    blockingWarningCount: Type.Integer({
      description: "Number of unaccepted warnings in blockingWarnings.",
      minimum: 0
    }),
    blockingWarnings: Type.Array(WarningReferenceSchema, {
      description:
        "Unaccepted warnings selected by the gate policy. Order is semantic and matches selected-channel order."
    }),
    evaluatedChannel: EvaluatedChannelSchema,
    evaluatedWarningCount: Type.Integer({
      description: "Number of warnings in the evaluated channel, including accepted warnings.",
      minimum: 0
    }),
    policy: GatePolicySchema,
    status: Type.Literal("passed", {
      description: "The evaluated channel contained no blocking warnings."
    })
  }, { additionalProperties: false }),
  Type.Object({
    blockingWarningCount: Type.Integer({
      description: "Number of unaccepted warnings in blockingWarnings.",
      minimum: 1
    }),
    blockingWarnings: Type.Array(WarningReferenceSchema, {
      description:
        "Unaccepted warnings selected by the gate policy. Order is semantic and matches selected-channel order.",
      minItems: 1
    }),
    evaluatedChannel: EvaluatedChannelSchema,
    evaluatedWarningCount: Type.Integer({
      description: "Number of warnings in the evaluated channel, including accepted warnings.",
      minimum: 1
    }),
    policy: GatePolicySchema,
    status: Type.Literal("failed", {
      description: "The evaluated channel contained at least one blocking warning."
    })
  }, { additionalProperties: false }),
  Type.Object({
    policy: GatePolicySchema,
    reasonCode: Type.Enum([
      "scan-incomplete",
      "no-eligible-input",
      "comparison-unavailable"
    ], {
      description: "Closed prerequisite reason that prevented gate evaluation.",
      type: "string"
    }),
    status: Type.Literal("not-evaluated", {
      description: "The requested gate lacked prerequisite evidence."
    })
  }, { additionalProperties: false })
], {
  description: "Discriminated final quality gate result."
});

export const MACHINE_METRICS_V1_SCHEMA = Type.Object({
  aggregates: Type.Object(AggregateMetricsSchema.properties, {
    additionalProperties: false,
    description: "Aggregated current measurements by language, code area, and overall totals."
  }),
  baseline: Type.Object(BaselineSchema.properties, {
    additionalProperties: false,
    description: "Baseline selection status and metadata for this invocation."
  }),
  baselineFingerprints: BaselineFingerprintMapSchema,
  comparisonStatus: Type.Enum([
    "compared",
    "input-unchanged",
    "baseline-unavailable"
  ], {
    description: "Closed state of current-to-baseline comparison evidence.",
    type: "string"
  }),
  currentFingerprints: FingerprintMapSchema,
  duplicateCode: Type.Array(DuplicateCodeFragmentSchema, {
    description:
      "Normalized duplicate fragments. Order is producer semantic and is preserved from scanner normalization."
  }),
  fileMetrics: Type.Array(FileMetricSchema, {
    description:
      "Normalized file measurements. Order is producer semantic and is preserved from current measurement output."
  }),
  functionMetrics: Type.Array(FunctionMetricSchema, {
    description:
      "Normalized function measurements. Order is producer semantic and is preserved from current measurement output."
  }),
  gate: GateResultSchema,
  metadata: Type.Object(MetadataSchema.properties, {
    additionalProperties: false,
    description: "Invocation, repository, scope, tool, and transport identity metadata."
  }),
  scanCompleteness: Type.Object(ScanCompletenessSchema.properties, {
    additionalProperties: false,
    description: "Final capability evidence and shared overall completeness result."
  }),
  trends: Type.Array(TrendDeltaSchema, {
    description:
      "Normalized current-to-baseline metric deltas. Order is producer semantic and is preserved from core trend generation."
  }),
  warnings: Type.Object(WarningChannelsSchema.properties, {
    additionalProperties: false,
    description: "Final normalized warning channels used by report, stream, and gate projections."
  })
}, {
  $id: MACHINE_METRICS_V1_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  description:
    "Current Vibe Check metrics artifact. Object member order and JSON whitespace have no instance meaning.",
  title: "Vibe Check machine metrics v1"
});

export type MachineWarningV1 = Type.Static<typeof MACHINE_WARNING_V1_SCHEMA>;

type MachineSchemaReferences = {
  [MACHINE_WARNING_V1_SCHEMA_ID]: typeof MACHINE_WARNING_V1_SCHEMA;
};

export type MachineMetricsV1 = Type.Static<
  typeof MACHINE_METRICS_V1_SCHEMA,
  MachineSchemaReferences
>;
