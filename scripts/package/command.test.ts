import assert from "node:assert/strict";
import test from "node:test";

import { FULL_PACKAGE_ACCEPTANCE_INVOCATION, runPackageCommand } from "./command.ts";
import type { PreparedPackageCandidate } from "./candidate/prepare.ts";

const staleStatus = Object.freeze({
  candidateVersion: "0.0.0-local.stale",
  freshness: "stale" as const,
  installedEntryPath: undefined,
  requiredAction: Object.freeze({ action: "rebuild" as const, reason: "receipt-missing" as const }),
  tarballPath: "/fixture/build/artifacts/zxyycom-vibe-check-0.0.0-local.stale.tgz",
  unpackedPackagePath: "/fixture/build/package"
});

const currentStatus = Object.freeze({
  ...staleStatus,
  freshness: "current" as const,
  installedEntryPath: "/fixture/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  requiredAction: undefined
});

const rebuiltCandidate: PreparedPackageCandidate = Object.freeze({
  artifactPath: "/fixture/build/artifacts/zxyycom-vibe-check-0.0.0-local.stale.tgz",
  candidateVersion: "0.0.0-local.stale",
  consumerDirectory: "/fixture/consumer",
  files: Object.freeze(["package/index.mjs"]),
  inputFingerprint: "fingerprint",
  installedPackageDirectory: "/fixture/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "rebuild",
  preparationReason: "receipt-missing",
  resolvedEntryPath: "/fixture/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: false,
  sha256: "digest",
  stagingDirectory: "/fixture/build/package"
});

test("package root commands distinguish stale status from a completed rebuild and bind verification to complete --all acceptance", async () => {
  assert.equal(FULL_PACKAGE_ACCEPTANCE_INVOCATION.command, "mise");
  assert.deepEqual(FULL_PACKAGE_ACCEPTANCE_INVOCATION.args.slice(-1), ["--all"]);
  assert.deepEqual(FULL_PACKAGE_ACCEPTANCE_INVOCATION.args.slice(0, 3), ["exec", "--", "bun"]);
  assert.match(
    FULL_PACKAGE_ACCEPTANCE_INVOCATION.args[3] ?? "",
    /scripts\/project\/gate\/run\.ts$/
  );
  let verified = false;
  const staleMessages: string[] = [];
  assert.equal(
    await runPackageCommand(["status"], {
      inspect: () => staleStatus,
      report: (line) => staleMessages.push(line)
    }),
    1
  );
  assert.deepEqual(staleMessages.slice(1, 3), [
    "package freshness: stale",
    "package required preparation: rebuild (receipt-missing)"
  ]);

  const currentMessages: string[] = [];
  assert.equal(
    await runPackageCommand(["status"], {
      inspect: () => currentStatus,
      report: (line) => currentMessages.push(line)
    }),
    0
  );
  assert.equal(currentMessages.includes("package freshness: current"), true);
  assert.equal(
    currentMessages.some((line) => line.includes("required preparation")),
    false
  );

  const buildMessages: string[] = [];
  assert.equal(
    await runPackageCommand(["build"], {
      prepare: async () => rebuiltCandidate,
      report: (line) => buildMessages.push(line)
    }),
    0
  );
  assert.deepEqual(buildMessages.slice(1, 3), [
    "package state: current",
    "package preparation action: rebuild (receipt-missing)"
  ]);

  assert.equal(
    await runPackageCommand(["verify"], {
      verify: async () => {
        verified = true;
        return 0;
      }
    }),
    0
  );
  assert.equal(verified, true);
  await assert.rejects(() => runPackageCommand(["status", "unexpected"]), /usage:/);
});
