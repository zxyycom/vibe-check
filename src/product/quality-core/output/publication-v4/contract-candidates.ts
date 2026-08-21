import { MACHINE_RECORD_V4_SCHEMA_PATH, MACHINE_RUN_V4_SCHEMA_PATH } from "./schema-identities.ts";
import { type MachinePublicationV4 } from "./mapper.ts";
import { MACHINE_RECORD_V4_SCHEMA, MACHINE_RUN_V4_SCHEMA } from "./schema.ts";
import {
  serializeMachinePublicationV4,
  type MachinePublicationCandidatesV4
} from "./serializers.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface PublicationContractCandidatesV4 {
  readonly schemas: Readonly<Record<string, string>>;
  readonly example: MachinePublicationCandidatesV4;
}

export function generatePublicationContractCandidatesV4(
  publication: MachinePublicationV4
): PublicationContractCandidatesV4 {
  return freezePublicationValue({
    schemas: {
      [MACHINE_RUN_V4_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RUN_V4_SCHEMA, null, 2)}\n`,
      [MACHINE_RECORD_V4_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RECORD_V4_SCHEMA, null, 2)}\n`
    },
    example: serializeMachinePublicationV4(publication)
  });
}
