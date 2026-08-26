import type { MachinePublicationV4 } from "./projection.ts";

export interface MachinePublicationCandidatesV4 {
  readonly recordsNdjson: string;
  readonly runJson: string;
}

export function serializeMachinePublicationV4(
  publication: MachinePublicationV4
): MachinePublicationCandidatesV4 {
  return Object.freeze({
    runJson: JSON.stringify(publication.run, null, 2),
    recordsNdjson:
      publication.records.length === 0
        ? ""
        : `${publication.records.map((record) => JSON.stringify(record)).join("\n")}\n`
  });
}
