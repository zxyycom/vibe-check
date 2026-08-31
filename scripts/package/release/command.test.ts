import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { createFullReleaseAcceptanceInvocation, runFormalReleaseCommand } from "./command.ts";
import { parseFormalReleaseReceipt } from "./receipt.ts";
import { sha256File } from "../pack.ts";

test("formal release root commands require closed inputs and bind verification to one full-Gate receipt", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-release-command-"));
  try {
    const artifactPath = join(root, "zxyycom-vibe-check-0.0.1.tgz");
    writeFileSync(artifactPath, "fixture artifact\n", "utf8");
    const receipt = parseFormalReleaseReceipt(formalReleaseReceiptFixture());
    const prepared = Object.freeze({
      artifact: Object.freeze({
        artifactPath,
        candidateVersion: "0.0.1",
        files: receipt.artifact.files,
        inputFingerprint: receipt.source.inputFingerprint,
        sha256: sha256File(artifactPath),
        stagingDirectory: join(root, "release-package")
      }),
      receipt,
      receiptPath: join(root, "zxyycom-vibe-check-0.0.1.release.json")
    });
    let prepareInput: Readonly<{ readonly tag: string; readonly version: string }> | undefined;
    const messages: string[] = [];
    assert.equal(
      await runFormalReleaseCommand(["prepare", "--tag", "latest", "--version", "0.0.1"], {
        prepare: async (input) => {
          prepareInput = input;
          return prepared;
        },
        report: (line) => messages.push(line)
      }),
      0
    );
    assert.deepEqual(prepareInput, { tag: "latest", version: "0.0.1" });
    assert.match(messages.join("\n"), /formal release package: @zxyycom\/vibe-check@0\.0\.1/u);
    assert.ok(
      messages.includes(`formal release integrity: ${prepared.receipt.artifact.integrity}`)
    );

    let verifiedReceipt: string | undefined;
    assert.equal(
      await runFormalReleaseCommand(
        ["verify", "--receipt", "build/releases/zxyycom-vibe-check-0.0.1.release.json"],
        {
          verify: async (receiptPath) => {
            verifiedReceipt = receiptPath;
            return 0;
          }
        }
      ),
      0
    );
    assert.equal(verifiedReceipt, "build/releases/zxyycom-vibe-check-0.0.1.release.json");
    assert.equal(
      await runFormalReleaseCommand(
        ["verify", "--receipt", "build/releases/zxyycom-vibe-check-0.0.1.release.json"],
        { verify: () => 2 }
      ),
      2
    );

    const invocation = createFullReleaseAcceptanceInvocation(verifiedReceipt);
    assert.equal(invocation.command, "mise");
    assert.deepEqual(invocation.args.slice(0, 3), ["exec", "--", "bun"]);
    assert.deepEqual(invocation.args.slice(-4, -2), ["--profile", "full"]);
    assert.equal(invocation.args.at(-2), "--release-receipt");
    assert.match(
      invocation.args.at(-1) ?? "",
      /build\/releases\/zxyycom-vibe-check-0\.0\.1\.release\.json$/u
    );

    const rootManifest: unknown = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8")
    );
    assert.ok(isNonArrayRecord(rootManifest));
    assert.ok(isNonArrayRecord(rootManifest.scripts));
    assert.equal(
      rootManifest.scripts["package:release:prepare"],
      "bun scripts/package/release/command.ts prepare"
    );
    assert.equal(
      rootManifest.scripts["package:release:verify"],
      "bun scripts/package/release/command.ts verify"
    );

    await assert.rejects(
      () => runFormalReleaseCommand(["prepare", "--version", "0.0.1"]),
      /requires --tag/u
    );
    await assert.rejects(
      () =>
        runFormalReleaseCommand(["verify", "--receipt", "first.json", "--receipt", "second.json"]),
      /invalid or duplicated/u
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function formalReleaseReceiptFixture(): unknown {
  return {
    schemaVersion: 1,
    package: { name: "@zxyycom/vibe-check", version: "0.0.1", tag: "latest" },
    source: { commit: "b".repeat(40), inputFingerprint: "a".repeat(64) },
    artifact: {
      path: "build/artifacts/zxyycom-vibe-check-0.0.1.tgz",
      files: ["package/index.mjs"],
      sha256: "c".repeat(64),
      integrity: `sha512-${"A".repeat(86)}==`
    },
    staging: { path: "build/release-package" },
    contract: {
      bunEngine: ">=1.3.14",
      license: "MIT",
      ownLicense: {
        path: "LICENSE",
        sha256: "2c005fcd357a0fd2f0136a9cbb3b80645ace42b186368c8ffe144b2912bb107a"
      },
      publish: { access: "public", registry: "https://registry.npmjs.org/" },
      readme: { path: "README.md", sha256: "d".repeat(64) },
      repository: "git+https://github.com/zxyycom/vibe-check.git",
      thirdPartyLicenses: [
        {
          path: "third-party-licenses/momoa-3.3.12-LICENSE",
          sha256: "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
        }
      ]
    }
  };
}
