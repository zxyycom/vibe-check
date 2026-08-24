import type { CoreSnapshot } from "../../core/facts.ts";
import { MACHINE_V4_TIMESTAMP_PATTERN } from "./schema-identities.ts";

const machineV4TimestampPattern = new RegExp(MACHINE_V4_TIMESTAMP_PATTERN);

export interface PublicationInvocationV4 {
  readonly invocationId: string;
  readonly projectRoot: ".";
  readonly timestamp: string;
}

/** Trusted Core facts and validated invocation metadata for v4 candidate projection. */
export interface TrustedPublicationModelV4 {
  readonly invocation: PublicationInvocationV4;
  readonly snapshot: CoreSnapshot;
}

export function createPublicationModelV4(
  input: Readonly<{ invocation: PublicationInvocationV4; snapshot: CoreSnapshot }>
): TrustedPublicationModelV4 {
  validateInvocation(input.invocation);
  return Object.freeze({
    invocation: Object.freeze({ ...input.invocation }),
    snapshot: input.snapshot
  });
}

function validateInvocation(invocation: PublicationInvocationV4): void {
  if (
    typeof invocation.invocationId !== "string" ||
    invocation.invocationId.length === 0 ||
    invocation.projectRoot !== "." ||
    typeof invocation.timestamp !== "string" ||
    !machineV4TimestampPattern.test(invocation.timestamp)
  ) {
    throw new TypeError("Publication invocation metadata is invalid");
  }
}
