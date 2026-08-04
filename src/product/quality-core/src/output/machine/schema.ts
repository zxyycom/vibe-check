import Type from "typebox";

import {
  AggregateMetricsSchema,
  TrendDeltaSchema
} from "./metrics-aggregate-schema.ts";
import {
  GateResultSchema,
  ScanCompletenessSchema,
  WarningChannelsSchema
} from "./metrics-evidence-schema.ts";
import {
  DuplicateCodeFragmentSchema,
  FileMetricSchema,
  FunctionMetricSchema
} from "./metrics-measurement-schema.ts";
import {
  BaselineFingerprintMapSchema,
  BaselineSchema,
  FingerprintMapSchema,
  MetadataSchema
} from "./metrics-metadata-schema.ts";
import {
  MACHINE_METRICS_V1_SCHEMA_ID,
  MACHINE_WARNING_V1_SCHEMA_ID
} from "./schema-identities.ts";
import { MACHINE_WARNING_V1_SCHEMA } from "./warning-schema.ts";

export {
  MACHINE_METRICS_V1_IDENTITY,
  MACHINE_METRICS_V1_SCHEMA_ID,
  MACHINE_METRICS_V1_SCHEMA_PATH,
  MACHINE_WARNING_V1_IDENTITY,
  MACHINE_WARNING_V1_SCHEMA_ID,
  MACHINE_WARNING_V1_SCHEMA_PATH
} from "./schema-identities.ts";
export { MACHINE_WARNING_V1_SCHEMA } from "./warning-schema.ts";

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
