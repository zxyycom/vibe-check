import { MACHINE_RECORD_V4_IDENTITY, MACHINE_RUN_V4_IDENTITY } from "./schema-identities.ts";
import type { ValidatedPublicationModelV4 } from "./model.ts";
import { createRecordsFingerprintV4 } from "./records-fingerprint.ts";
import type { MachineRecordV4, MachineRunV4 } from "./schema.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface MachinePublicationV4 {
  readonly records: readonly MachineRecordV4[];
  readonly run: MachineRunV4;
}

export function projectMachinePublicationV4(
  model: ValidatedPublicationModelV4
): MachinePublicationV4 {
  const records = Object.freeze(
    model.snapshot.records.map((record): MachineRecordV4 =>
      freezePublicationValue({
        checkId: record.checkId,
        data: record.data,
        id: record.id,
        schemaVersion: MACHINE_RECORD_V4_IDENTITY
      })
    )
  );
  const run: MachineRunV4 = {
    checks: model.snapshot.checks.map((check): MachineRunV4["checks"][number] => ({
      checkId: check.checkId,
      displayName: check.displayName,
      outcome: check.outcome
    })),
    invocation: { ...model.invocation },
    recordsFingerprint: createRecordsFingerprintV4(records),
    schemaVersion: MACHINE_RUN_V4_IDENTITY
  };
  return Object.freeze({ records, run: freezePublicationValue(run) });
}
