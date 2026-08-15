import {
  MACHINE_RECORD_V2_SCHEMA_PATH,
  MACHINE_RUN_V2_SCHEMA_PATH
} from "./schema-identities.ts";
import { type MachinePublicationV2 } from "./mapper.ts";
import {
  MACHINE_RECORD_V2_SCHEMA,
  MACHINE_RUN_V2_SCHEMA
} from "./schema.ts";
import {
  serializeMachinePublicationV2,
  type MachinePublicationCandidatesV2
} from "./serializers.ts";

export interface PublicationContractCandidatesV2 {
  readonly schemas: Readonly<Record<string, string>>;
  readonly example: MachinePublicationCandidatesV2;
}

export function generatePublicationContractCandidatesV2(
  publication: MachinePublicationV2
): PublicationContractCandidatesV2 {
  return deepFreeze({
    schemas: {
      [MACHINE_RUN_V2_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RUN_V2_SCHEMA, null, 2)}\n`,
      [MACHINE_RECORD_V2_SCHEMA_PATH]: `${JSON.stringify(MACHINE_RECORD_V2_SCHEMA, null, 2)}\n`
    },
    example: serializeMachinePublicationV2(publication)
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
