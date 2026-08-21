export {
  MACHINE_RECORD_V4_IDENTITY,
  MACHINE_RECORD_V4_SCHEMA_ID,
  MACHINE_RECORD_V4_SCHEMA_PATH,
  MACHINE_RUN_V4_IDENTITY,
  MACHINE_RUN_V4_SCHEMA_ID,
  MACHINE_RUN_V4_SCHEMA_PATH
} from "./schema-identities.ts";
export {
  MACHINE_RECORD_V4_SCHEMA,
  MACHINE_RUN_V4_SCHEMA,
  type MachineRecordV4,
  type MachineRunV4
} from "./schema.ts";
export {
  createPublicationModelV4,
  type PublicationInvocationV4,
  type ValidatedPublicationModelV4
} from "./model.ts";
export { projectMachinePublicationV4, type MachinePublicationV4 } from "./mapper.ts";
export {
  serializeMachinePublicationV4,
  type MachinePublicationCandidatesV4
} from "./serializers.ts";
export {
  MACHINE_RECORDS_V4_FINGERPRINT_PREFIX,
  createRecordsFingerprintV4
} from "./records-fingerprint.ts";
export {
  generatePublicationContractCandidatesV4,
  type PublicationContractCandidatesV4
} from "./contract-candidates.ts";
export {
  validateMachinePublicationSetV4,
  type MachinePublicationSetRelationship,
  type MachinePublicationValidationCategory,
  type MachinePublicationValidationDiagnostic,
  type MachinePublicationValidationResult
} from "./validation.ts";
export { planPublicationCleanupV4, type PublicationCleanupPlanV4 } from "./publication-plan.ts";

export const PUBLICATION_V4_LIFECYCLE = Object.freeze({
  candidateStages: Object.freeze([
    "validate-publication-model",
    "serialize-machine-candidates",
    "validate-machine-set"
  ] as const),
  artifactStages: Object.freeze([
    "cleanup-stale-owned-temps",
    "write-same-directory-owned-temps",
    "rename-machine-files",
    "cleanup-retired-artifacts",
    "publish-trusted-paths"
  ] as const)
});

export const PUBLICATION_V4_FAILURE_STAGES = Object.freeze([
  ...PUBLICATION_V4_LIFECYCLE.candidateStages,
  ...PUBLICATION_V4_LIFECYCLE.artifactStages.slice(0, -1)
] as const);

export type PublicationFailureStageV4 = (typeof PUBLICATION_V4_FAILURE_STAGES)[number];
