import { createCoreCheckSession } from "../../core/session.ts";
import type { CoreSnapshot } from "../../core/facts.ts";

const registrations = [
  { definition: { checkId: "a-failed", displayName: "Failed" } },
  { definition: { checkId: "b-not-applicable", displayName: "Not applicable" } },
  { definition: { checkId: "c-passed", displayName: "Passed" } },
  { definition: { checkId: "d-unavailable", displayName: "Unavailable" } }
] as const;

export function publicationSnapshot(): CoreSnapshot {
  const session = createCoreCheckSession(registrations);
  const failed = session.openCheckScope("a-failed");
  failed.records.report({ id: "sample:one" }, { details: { count: 1 } });
  failed.settle({ status: "failed", data: { summary: "found one" } });
  session.openCheckScope("b-not-applicable").settle({ status: "not-applicable" });
  session.openCheckScope("c-passed").settle({ status: "passed", data: { summary: "clear" } });
  session.openCheckScope("d-unavailable").settleProduct({
    status: "unavailable",
    reason: { code: "dependency-unavailable", checkIds: ["c-passed"] }
  });
  return session.freeze();
}

export const PUBLICATION_INVOCATION = {
  invocationId: "invocation/v1:publication-v4",
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
};
