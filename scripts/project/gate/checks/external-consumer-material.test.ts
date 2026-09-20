import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { after, test } from "node:test";

import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../../package/candidate/acceptance-input.ts";
import { EXTERNAL_CONSUMER_ROOT_ENV } from "../../../package/candidate/external-consumer/input.ts";
import type { ExternalConsumerMaterialData } from "../../../package/candidate/external-consumer/input.ts";
import { sha256File } from "../../../package/pack.ts";
import type { CanonicalJsonObject, CheckDependencies } from "@zxyycom/vibe-check";
import type { ProjectGatePreparedCandidateData } from "./prepared-candidate.ts";
import {
  createAfterCommandFixture,
  invokeCheckWithRecords
} from "./check-execution.test-support.ts";
import {
  createExternalConsumerMaterialCheck,
  type ExternalConsumerMaterialLease,
  resolveExternalConsumerProviderEnvironment,
  settleExternalConsumerProviderCommand,
  validateExternalConsumerProviderProvenance
} from "./external-consumer-material.ts";

const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-external-consumer-test-"));
const artifactPath = join(fixtureRoot, "candidate.tgz");
const providerRoot = join(fixtureRoot, "provider");
const consumerDirectory = join(providerRoot, "consumer");
const installedPackageDirectory = join(consumerDirectory, "node_modules", "@zxyycom", "vibe-check");
const resolvedEntryPath = join(installedPackageDirectory, "index.mjs");
mkdirSync(installedPackageDirectory, { recursive: true });
writeFileSync(artifactPath, "candidate artifact\n", "utf8");
writeFileSync(resolvedEntryPath, "export {};\n", "utf8");

const preparedCandidate = Object.freeze({
  artifactPath,
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/candidate-consumer",
  files: Object.freeze(["package/index.mjs"]),
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory: "/tmp/candidate-consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath: "/tmp/candidate-consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  schemaVersion: 3,
  sha256: sha256File(artifactPath),
  stagingDirectory: "/tmp/candidate-staging"
}) satisfies ProjectGatePreparedCandidateData & CanonicalJsonObject;
const lease: ExternalConsumerMaterialLease = Object.freeze({
  cleanup(): void {},
  providerRoot: () => providerRoot
});
const externalConsumerData: ExternalConsumerMaterialData = Object.freeze({
  artifactPath: preparedCandidate.artifactPath,
  consumerDirectory,
  installedPackageDirectory,
  resolvedEntryPath,
  schemaVersion: 1,
  sha256: preparedCandidate.sha256
});

after(() => {
  rmSync(fixtureRoot, { force: true, recursive: true });
});

test("external consumer provider binds typed output to invocation provenance", async () => {
  const check = createExternalConsumerMaterialCheck({
    lease,
    preparedCandidateCheckId: "prepared-package-candidate",
    timeoutMs: 30_000
  });
  assert.equal(check.options.workingDirectory, process.cwd());
  assert.deepEqual(check.options.arguments, [
    resolve("scripts/package/candidate/external-consumer/provider.ts")
  ]);
  assert.deepEqual(check.dependsOn, ["prepared-package-candidate"]);
  assert.deepEqual(check.options.output, { mode: "transcript" });
  assert.equal(typeof check.parseData, "function");

  const dependencies = preparedCandidateDependencies();
  assert.deepEqual(
    resolveExternalConsumerProviderEnvironment({
      dependencies,
      lease,
      preparedCandidateCheckId: "prepared-package-candidate"
    }),
    {
      mode: "inherit",
      overrides: {
        [CANDIDATE_ARTIFACT_PATH_ENV]: preparedCandidate.artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: preparedCandidate.sha256,
        [EXTERNAL_CONSUMER_ROOT_ENV]: providerRoot
      }
    }
  );

  const completed = createAfterCommandFixture({
    dependencies,
    exitCode: 0,
    stdout: JSON.stringify(externalConsumerData)
  });
  assert.deepEqual(
    settleExternalConsumerProviderCommand({
      context: completed.context,
      lease,
      preparedCandidateCheckId: "prepared-package-candidate"
    }),
    { status: "passed", data: externalConsumerData }
  );
  assert.deepEqual(completed.records, []);

  const expectedEnvironment = {
    [CANDIDATE_ARTIFACT_PATH_ENV]: preparedCandidate.artifactPath,
    [CANDIDATE_ARTIFACT_SHA256_ENV]: preparedCandidate.sha256,
    [EXTERNAL_CONSUMER_ROOT_ENV]: providerRoot
  };
  const fixtureSource = [
    `const expected = ${JSON.stringify(expectedEnvironment)};`,
    "for (const [name, value] of Object.entries(expected)) {",
    "  if (process.env[name] !== value) process.exit(19);",
    "}",
    `process.stdout.write(${JSON.stringify(JSON.stringify(externalConsumerData))});`
  ].join("\n");
  const artifactDirectory = join(fixtureRoot, "external-consumer-artifact");
  const wired = await invokeCheckWithRecords(
    createExternalConsumerMaterialCheck(
      {
        lease,
        preparedCandidateCheckId: "prepared-package-candidate",
        timeoutMs: 30_000
      },
      {
        args: ["--eval", fixtureSource],
        command: process.execPath,
        cwd: process.cwd()
      }
    ),
    new AbortController().signal,
    artifactDirectory,
    dependencies
  );
  assert.deepEqual(wired.result, { status: "passed", data: externalConsumerData });
  assert.deepEqual(wired.records, []);
  assert.match(readFileSync(join(artifactDirectory, "process.log"), "utf8"), /status=passed/);

  assert.equal(
    validateExternalConsumerProviderProvenance(
      externalConsumerData,
      preparedCandidate,
      providerRoot
    ),
    externalConsumerData
  );
  assert.throws(
    () =>
      validateExternalConsumerProviderProvenance(
        { ...externalConsumerData, artifactPath: "/tmp/same-digest-different-artifact.tgz" },
        preparedCandidate,
        providerRoot
      ),
    /owned provenance/
  );
  assert.throws(
    () =>
      validateExternalConsumerProviderProvenance(
        { ...externalConsumerData, consumerDirectory: "/tmp/escaped-consumer" },
        preparedCandidate,
        providerRoot
      ),
    /owned provenance/
  );
});

test("external consumer provider keeps nonzero output unavailable with generic evidence", () => {
  const completed = createAfterCommandFixture({
    dependencies: preparedCandidateDependencies(),
    exitCode: 17,
    stdout: JSON.stringify(externalConsumerData)
  });

  assert.deepEqual(
    settleExternalConsumerProviderCommand({
      context: completed.context,
      lease,
      preparedCandidateCheckId: "prepared-package-candidate"
    }),
    {
      status: "unavailable",
      reason: { code: "external-consumer-provider-failed" },
      messages: [
        {
          level: "error",
          code: "command-failed",
          message:
            "Command exited with code 17; signal: none; transcript: checks/vibe-check-command-fixture/process.log."
        }
      ]
    }
  );
  assert.deepEqual(completed.records, [
    {
      identity: { id: "command-failure" },
      data: {
        command: basename(process.execPath),
        exitCode: 17,
        log: "checks/vibe-check-command-fixture/process.log",
        signal: "none"
      }
    }
  ]);
});

type HandoffProvider<Id extends string = string> = Readonly<{
  readonly checkId: Id;
  readonly handoff: true;
}>;
type DependencyNotDeclaredResult = Readonly<{
  readonly ok: false;
  readonly error: Readonly<{ readonly code: "dependency-not-declared"; readonly checkId: string }>;
}>;
type PreparedCandidateDependencyResult = Readonly<{
  readonly ok: true;
  readonly checkId: "prepared-package-candidate";
  readonly data: CanonicalJsonObject;
  readonly status: "passed";
}>;

function preparedCandidateDependencies(): CheckDependencies {
  return Object.freeze({
    get: readPreparedCandidateDependency,
    list: () =>
      Object.freeze([
        Object.freeze({
          checkId: "prepared-package-candidate",
          outcome: Object.freeze({ status: "passed", data: preparedCandidate })
        })
      ])
  });
}

function readPreparedCandidateDependency<Id extends string>(
  provider: HandoffProvider<Id>
): DependencyNotDeclaredResult;
function readPreparedCandidateDependency(
  checkId: string
): DependencyNotDeclaredResult | PreparedCandidateDependencyResult;
function readPreparedCandidateDependency(
  dependency: string | HandoffProvider
): DependencyNotDeclaredResult | PreparedCandidateDependencyResult {
  const checkId = typeof dependency === "string" ? dependency : dependency.checkId;
  if (checkId === "prepared-package-candidate" && typeof dependency === "string") {
    return Object.freeze({
      ok: true,
      checkId: "prepared-package-candidate",
      data: preparedCandidate,
      status: "passed"
    });
  }
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: "dependency-not-declared", checkId })
  });
}
