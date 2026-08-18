import { MACHINE_RECORD_V3_SCHEMA_PATH, MACHINE_RUN_V3_SCHEMA_PATH } from "./schema-identities.ts";
import { type MachinePublicationV3 } from "./mapper.ts";
import { MACHINE_RECORD_V3_SCHEMA, MACHINE_RUN_V3_SCHEMA } from "./schema.ts";
import {
  serializeMachinePublicationV3,
  type MachinePublicationCandidatesV3
} from "./serializers.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface PublicationContractCandidatesV3 {
  readonly schemas: Readonly<Record<string, string>>;
  readonly example: MachinePublicationCandidatesV3;
}

export function generatePublicationContractCandidatesV3(
  publication: MachinePublicationV3
): PublicationContractCandidatesV3 {
  return freezePublicationValue({
    schemas: {
      [MACHINE_RUN_V3_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RUN_V3_SCHEMA, null, 2)}\n`,
      [MACHINE_RECORD_V3_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RECORD_V3_SCHEMA, null, 2)}\n`
    },
    example: serializeMachinePublicationV3(publication)
  });
}
