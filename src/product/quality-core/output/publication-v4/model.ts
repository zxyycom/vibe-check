import type { CoreSnapshot } from "../../check-record/model.ts";
import { validateCoreSnapshot } from "../../check-record/validation.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface PublicationInvocationV4 {
  readonly invocationId: string;
  readonly projectRoot: ".";
  readonly timestamp: string;
}

/** The validated terminal source for the two machine artifacts. */
export interface ValidatedPublicationModelV4 {
  readonly invocation: PublicationInvocationV4;
  readonly snapshot: CoreSnapshot;
}

export function createPublicationModelV4(
  input: Readonly<{ invocation: PublicationInvocationV4; snapshot: CoreSnapshot }>
): ValidatedPublicationModelV4 {
  const snapshot = validateCoreSnapshot(input.snapshot);
  if (!snapshot.ok) throw new TypeError("Publication requires a valid Core snapshot");
  validateInvocation(input.invocation);
  return freezePublicationValue({
    invocation: { ...input.invocation },
    snapshot: snapshot.value
  });
}

function validateInvocation(invocation: PublicationInvocationV4): void {
  if (
    typeof invocation.invocationId !== "string" ||
    invocation.invocationId.length === 0 ||
    invocation.projectRoot !== "." ||
    typeof invocation.timestamp !== "string" ||
    Number.isNaN(Date.parse(invocation.timestamp))
  ) {
    throw new TypeError("Publication invocation metadata is invalid");
  }
}
