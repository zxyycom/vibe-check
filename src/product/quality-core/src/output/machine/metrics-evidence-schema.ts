import Type from "typebox";

import { MACHINE_WARNING_V1_SCHEMA_ID } from "./schema-identities.ts";

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

export const ScanCompletenessSchema = Type.Object({
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
export const WarningChannelsSchema = Type.Object({
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

export const GateResultSchema = Type.Union([
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
