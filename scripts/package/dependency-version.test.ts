import assert from "node:assert/strict";
import test from "node:test";

import {
  isAcceptedPackageDependencyVersion,
  packageDependencyVersionRequirementText
} from "./dependency-version.ts";

test("package dependency versions satisfy only their declared requirement", () => {
  const exact = { kind: "exact", version: "8.20.0" } as const;
  const range = { kind: "range", range: "^5.1.1" } as const;

  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: exact, resolvedVersion: "8.20.0" }),
    true
  );
  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: exact, resolvedVersion: "8.20.1" }),
    false
  );
  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: range, resolvedVersion: "5.1.1" }),
    true
  );
  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: range, resolvedVersion: "5.1.0" }),
    false
  );
  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: range, resolvedVersion: "5.9.0" }),
    true
  );
  assert.equal(
    isAcceptedPackageDependencyVersion({ requirement: range, resolvedVersion: "6.0.0" }),
    false
  );
  assert.equal(packageDependencyVersionRequirementText(exact), "8.20.0");
  assert.equal(packageDependencyVersionRequirementText(range), "^5.1.1");
});
