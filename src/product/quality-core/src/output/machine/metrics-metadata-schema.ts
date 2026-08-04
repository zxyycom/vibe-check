import Type from "typebox";

import { MACHINE_METRICS_V1_IDENTITY } from "./schema-identities.ts";

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

export const MetadataSchema = Type.Object({
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
export const FingerprintMapSchema = Object.assign(
  Type.Record(Type.String(), CodeAreaFingerprintSchema, {
    description:
      "Dynamic map whose property names are Vibe Check code-area IDs and whose values are normalized fingerprints."
  }),
  { additionalProperties: CodeAreaFingerprintSchema }
);
Reflect.deleteProperty(FingerprintMapSchema, "patternProperties");
export const BaselineFingerprintMapSchema = Object.assign(
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

export const BaselineSchema = Type.Object({
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

export const MetricValueSchema = Type.Object({
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
