import Type from "typebox";

import {
  MACHINE_WARNING_V1_IDENTITY,
  MACHINE_WARNING_V1_SCHEMA_ID
} from "./schema-identities.ts";

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
