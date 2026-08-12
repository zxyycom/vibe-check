export const GATE_POLICY_DESCRIPTORS = Object.freeze([
  {
    help: "Evaluate all records produced by the resolved scan profile.",
    requiresComparison: false,
    value: "all"
  },
  {
    help: "Evaluate records associated with changed code.",
    requiresComparison: true,
    value: "changed"
  },
  {
    help: "Evaluate changed records that regress from the baseline.",
    requiresComparison: true,
    value: "regressions"
  }
] as const);

export type GatePolicyDescriptor = typeof GATE_POLICY_DESCRIPTORS[number];
export type GatePolicy = GatePolicyDescriptor["value"];

export const GATE_POLICY_VALUES: readonly GatePolicy[] = Object.freeze(
  GATE_POLICY_DESCRIPTORS.map(({ value }) => value)
);

export const GATE_POLICY_HELP: readonly string[] = Object.freeze(
  GATE_POLICY_DESCRIPTORS.map(({ help, value }) => `${value}: ${help}`)
);
