import type { MachinePublicationV3 } from "./mapper.ts";

export interface MachinePublicationCandidatesV3 {
  readonly recordsNdjson: string;
  readonly runJson: string;
}

export function serializeMachinePublicationV3(
  publication: MachinePublicationV3
): MachinePublicationCandidatesV3 {
  return Object.freeze({
    runJson: JSON.stringify(publication.run, null, 2),
    recordsNdjson:
      publication.records.length === 0
        ? ""
        : `${publication.records.map((record) => JSON.stringify(record)).join("\n")}\n`
  });
}
