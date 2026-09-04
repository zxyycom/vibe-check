import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import type { ExternalConsumerMaterialData } from "../../../package/candidate/external-consumer/input.ts";
import type { ProjectGatePreparedCandidateData } from "./prepared-candidate.ts";
import {
  createExternalConsumerMaterialCheck,
  createExternalConsumerMaterialLease,
  validateExternalConsumerProviderProvenance
} from "./external-consumer-material.ts";

test("external consumer provider binds typed output to invocation provenance", () => {
  const check = createExternalConsumerMaterialCheck({
    lease: createExternalConsumerMaterialLease(),
    preparedCandidateCheckId: "prepared-package-candidate",
    timeoutMs: 30_000
  });
  assert.equal(Reflect.get(check.options ?? {}, "cwd"), process.cwd());
  assert.deepEqual(Reflect.get(check.options ?? {}, "args"), [
    resolve("scripts/package/candidate/external-consumer/provider.ts")
  ]);

  const providerRoot = "/tmp/vibe-check-external-provider";
  const candidate: ProjectGatePreparedCandidateData = {
    artifactPath: "/tmp/vibe-check-candidate.tgz",
    candidateVersion: "0.0.0-local.fixture",
    consumerDirectory: "/tmp/candidate-consumer",
    files: ["package/index.mjs"],
    inputFingerprint: "a".repeat(64),
    installedPackageDirectory: "/tmp/candidate-consumer/node_modules/@zxyycom/vibe-check",
    preparationAction: "reuse",
    preparationReason: "installation-current",
    resolvedEntryPath: "/tmp/candidate-consumer/node_modules/@zxyycom/vibe-check/index.mjs",
    reused: true,
    schemaVersion: 3,
    sha256: "b".repeat(64),
    stagingDirectory: "/tmp/candidate-staging"
  };
  const data: ExternalConsumerMaterialData = {
    artifactPath: candidate.artifactPath,
    consumerDirectory: `${providerRoot}/consumer`,
    installedPackageDirectory: `${providerRoot}/consumer/node_modules/@zxyycom/vibe-check`,
    resolvedEntryPath: `${providerRoot}/consumer/node_modules/@zxyycom/vibe-check/index.mjs`,
    schemaVersion: 1,
    sha256: candidate.sha256
  };

  assert.equal(validateExternalConsumerProviderProvenance(data, candidate, providerRoot), data);
  assert.throws(
    () =>
      validateExternalConsumerProviderProvenance(
        { ...data, artifactPath: "/tmp/same-digest-different-artifact.tgz" },
        candidate,
        providerRoot
      ),
    /owned provenance/
  );
  assert.throws(
    () =>
      validateExternalConsumerProviderProvenance(
        { ...data, consumerDirectory: "/tmp/escaped-consumer" },
        candidate,
        providerRoot
      ),
    /owned provenance/
  );
});
