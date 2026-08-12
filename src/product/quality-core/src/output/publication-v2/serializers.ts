import type { MachinePublicationV2 } from "./mapper.ts";

export interface MachinePublicationCandidatesV2 {
  readonly recordsNdjson: string;
  readonly runJson: string;
}

export function serializeMachinePublicationV2(
  publication: MachinePublicationV2
): MachinePublicationCandidatesV2 {
  return Object.freeze({
    runJson: JSON.stringify(publication.run, null, 2),
    recordsNdjson: publication.records.length === 0
      ? ""
      : `${publication.records.map((record) => JSON.stringify(record)).join("\n")}\n`
  });
}
