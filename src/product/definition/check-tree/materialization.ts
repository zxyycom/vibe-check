import { inherit, type Check, type InheritableCheckCollection } from "../custom-check.ts";
import type { ParsedCheck, ParsedCheckCollection, ParsedCheckTree } from "./authoring.ts";

/** Rebuilds the validated public authoring shape without retaining untyped input. */
export function materializeCheckTreeAuthoring(parsed: ParsedCheckTree): readonly Check[] {
  return materializeChecks(parsed.checks);
}

function materializeChecks(checks: readonly ParsedCheck[]): readonly Check[] {
  return Object.freeze(checks.map((check) => materializeCheck(check)));
}

function materializeCheck(check: ParsedCheck): Check {
  const checks = materializeChecks(check.checks);
  const dependsOn = materializeCollection(check.dependsOn);
  const mutex = materializeCollection(check.mutex);
  const scheduling = {
    ...(dependsOn === undefined ? {} : { dependsOn }),
    ...(check.maxParallel === undefined ? {} : { maxParallel: check.maxParallel }),
    ...(mutex === undefined ? {} : { mutex })
  };
  if (check.definition === null || check.execution === null || check.options === null) {
    return Object.freeze({
      checkId: check.checkId,
      checks,
      displayName: check.displayName,
      ...scheduling
    });
  }
  return Object.freeze({
    checkId: check.checkId,
    checks,
    displayName: check.displayName,
    execution: check.execution,
    options: check.options,
    ...scheduling
  });
}

function materializeCollection(
  collection: ParsedCheckCollection | undefined
): InheritableCheckCollection<string> | undefined {
  if (collection === undefined) return undefined;
  if (collection.kind === "exact") return collection.values;
  return inherit({ add: collection.add, remove: collection.remove });
}
