import {
  projectMachinePublicationV3,
  serializeMachinePublicationV3,
  validateMachinePublicationSetV3
} from "./index.ts";
import { encoder } from "./publication-test-assertions.ts";

type MachinePublication = ReturnType<typeof projectMachinePublicationV3>;
type MachineCandidates = ReturnType<typeof serializeMachinePublicationV3>;
type PublicationBytes = Parameters<typeof validateMachinePublicationSetV3>[0];

export interface InvalidPublicationCase {
  readonly label: string;
  readonly expected: {
    readonly category: "framing" | "schema" | "set-invariant";
    readonly logicalArtifact: "records.ndjson" | "run.json";
    readonly pointer?: string;
    readonly relationship?: string;
  };
  readonly bytes: PublicationBytes;
}

/** Builds independently malformed byte sets from one otherwise valid publication. */
export function invalidPublicationCases(
  machine: MachinePublication,
  candidates: MachineCandidates
): readonly InvalidPublicationCase[] {
  const validBytes: PublicationBytes = {
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  };
  return [
    recordFramingFailure(validBytes, candidates),
    runSchemaFailure(validBytes, machine),
    recordOwnershipFailure(validBytes, machine),
    danglingDecisionFailure(validBytes, machine)
  ];
}

function recordFramingFailure(
  validBytes: PublicationBytes,
  candidates: MachineCandidates
): InvalidPublicationCase {
  return {
    label: "record framing",
    expected: { category: "framing", logicalArtifact: "records.ndjson" },
    bytes: { ...validBytes, recordsNdjson: encoder.encode(candidates.recordsNdjson.trimEnd()) }
  };
}

function runSchemaFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "run schema",
    expected: { category: "schema", logicalArtifact: "run.json", pointer: "/schemaVersion" },
    bytes: {
      ...validBytes,
      runJson: encoder.encode(JSON.stringify({ ...machine.run, schemaVersion: "wrong" }))
    }
  };
}

function recordOwnershipFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "record ownership",
    expected: {
      category: "set-invariant",
      logicalArtifact: "records.ndjson",
      relationship: "record-check-ownership"
    },
    bytes: {
      ...validBytes,
      recordsNdjson: encoder.encode(
        `${JSON.stringify({ ...machine.records[0], checkId: "unknown-check" })}\n`
      )
    }
  };
}

function danglingDecisionFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "dangling decision record",
    expected: {
      category: "set-invariant",
      logicalArtifact: "run.json",
      relationship: "decision-record-reference"
    },
    bytes: {
      ...validBytes,
      runJson: encoder.encode(
        JSON.stringify({
          ...machine.run,
          decision: {
            ...machine.run.decision,
            views: [
              {
                viewId: "all-current",
                recordIds: [
                  "check-record/v1/record/sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                ]
              }
            ]
          }
        })
      )
    }
  };
}
