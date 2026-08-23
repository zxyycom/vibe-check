import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "../../src/product/public-contract/current.ts";
import { preparePackageCandidate } from "./index.ts";
import { renderPackageApiDocumentation } from "../docs/package-api-docs/render.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const candidateModuleUrl = new URL("./index.ts", import.meta.url).href;

describe("package candidate preparation", () => {
  it("prepares a physical candidate lifecycle", { timeout: 20_000 }, async () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-candidate-"));
    const consumerDirectory = join(temporaryRoot, "consumer");
    const stateDirectory = join(temporaryRoot, "state");
    try {
      const documentation = renderPackageApiDocumentation({ repositoryRoot });
      writeAncestorJscpdFallback(temporaryRoot);
      writeConsumerManifest(consumerDirectory);
      const first = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(first.reused, false);
      assert.equal(existsSync(first.artifactPath), true);
      assert.equal(lstatSync(first.installedPackageDirectory).isSymbolicLink(), false);
      assert.equal(existsSync(first.resolvedEntryPath), true);
      assert.equal(first.resolvedEntryPath.startsWith(first.installedPackageDirectory), true);
      assert.equal(
        readFileSync(join(repositoryRoot, "README.md"), "utf8"),
        documentation.readme.content
      );
      assert.equal(
        readFileSync(join(first.stagingDirectory, "README.md"), "utf8"),
        documentation.readme.content
      );
      assert.equal(
        readFileSync(join(first.installedPackageDirectory, "README.md"), "utf8"),
        documentation.readme.content
      );
      assert.equal(first.files.includes("package/README.md"), true);
      assertEmittedPublicDocumentation(first.stagingDirectory);
      assert.equal(
        runtimeExports(first.resolvedEntryPath),
        '["defineCheck","defineConfig","duplicateDetection","fileMetrics","functionMetrics","inherit","run"]'
      );
      assert.deepEqual(candidateDependencies(candidateManifest(first.installedPackageDirectory)), {
        jscpd: "5.0.11",
        neverthrow: "8.2.0",
        typebox: "1.3.9"
      });
      assert.equal(
        createRequire(first.resolvedEntryPath)
          .resolve("jscpd/package.json")
          .startsWith(join(consumerDirectory, "node_modules")),
        true
      );
      const reused = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(reused.reused, true);
      assert.equal(reused.inputFingerprint, first.inputFingerprint);
      assert.equal(reused.sha256, first.sha256);

      rmSync(join(consumerDirectory, "node_modules", "jscpd"), { force: true, recursive: true });
      const ancestorResolvedJscpd = resolveJscpdFromFreshBunProcess(first.resolvedEntryPath);
      assert.equal(
        ancestorResolvedJscpd.startsWith(join(temporaryRoot, "node_modules")),
        true,
        ancestorResolvedJscpd
      );
      const reinstalled = prepareInFreshBunProcess({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(reinstalled, false);
      assert.equal(
        createRequire(first.resolvedEntryPath)
          .resolve("jscpd/package.json")
          .startsWith(join(consumerDirectory, "node_modules")),
        true
      );

      const receiptSource = readFileSync(join(stateDirectory, "preparation-receipt.json"), "utf8");
      assert.equal(receiptSource.includes(first.inputFingerprint), true);
      writeFileSync(
        join(stateDirectory, "preparation-receipt.json"),
        receiptSource.replace(first.inputFingerprint, "stale-documentation-input-fingerprint"),
        "utf8"
      );
      const rebuilt = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(rebuilt.reused, false);
      assert.equal(rebuilt.inputFingerprint, first.inputFingerprint);
      assert.equal(existsSync(rebuilt.resolvedEntryPath), true);

      writeFileSync(join(stateDirectory, "preparation-receipt.json"), "not JSON\n", "utf8");
      const rebuiltFromMalformedReceipt = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(rebuiltFromMalformedReceipt.reused, false);
      assert.equal(rebuiltFromMalformedReceipt.inputFingerprint, first.inputFingerprint);
      assert.equal(existsSync(rebuiltFromMalformedReceipt.resolvedEntryPath), true);
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});

function assertEmittedPublicDocumentation(stagingDirectory: string): void {
  const declarationRoot = join(stagingDirectory, "types");
  const declarations = readDeclarationSources(declarationRoot);
  const publicRoots = [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.types)
  ];
  for (const publicRoot of publicRoots) {
    assert.equal(
      declarations.some((source) => hasAdjacentChineseJSDoc(source, publicRoot)),
      true,
      `emitted declaration is missing adjacent Chinese JSDoc for ${publicRoot}`
    );
  }

  const entrySource = readFileSync(
    join(declarationRoot, "scripts/package-candidate/entry.d.ts"),
    "utf8"
  );
  assert.match(entrySource, /@packageDocumentation/);
  assert.equal(
    declarations.some(
      (source) =>
        source.includes("@example 定义带 options、Records 与 messages 的自定义 Check") &&
        /export declare function defineCheck\b/.test(source)
    ),
    true,
    "emitted defineCheck declaration is missing its generated @example"
  );
}

function readDeclarationSources(root: string): readonly string[] {
  const sources: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".d.ts"))
        sources.push(readFileSync(path, "utf8"));
    }
  };
  visit(root);
  return Object.freeze(sources);
}

function hasAdjacentChineseJSDoc(source: string, declarationName: string): boolean {
  const escapedName = declarationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `/\\*\\*(?:(?!\\*\\/)[\\s\\S])*?[\\u3400-\\u9fff](?:(?!\\*\\/)[\\s\\S])*?\\*\\/\\s*export(?:\\s+declare)?\\s+(?:const|function|interface|type)\\s+${escapedName}\\b`
  );
  return pattern.test(source);
}

function writeConsumerManifest(consumerDirectory: string): void {
  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "vibe-check-candidate-test-consumer", private: true, type: "module" })}\n`,
    "utf8"
  );
}

function writeAncestorJscpdFallback(temporaryRoot: string): void {
  const packageDirectory = join(temporaryRoot, "node_modules", "jscpd");
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    `${JSON.stringify({
      bin: { jscpd: "./run-jscpd.js" },
      name: "jscpd",
      version: "5.0.11"
    })}\n`,
    "utf8"
  );
  writeFileSync(join(packageDirectory, "run-jscpd.js"), "", "utf8");
}

function resolveJscpdFromFreshBunProcess(candidateEntryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
      candidateEntryPath
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function prepareInFreshBunProcess(input: {
  readonly consumerDirectory: string;
  readonly repositoryRoot: string;
  readonly stateDirectory: string;
}): boolean {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { preparePackageCandidate } = await import(process.argv[1]); const candidate = await preparePackageCandidate({ repositoryRoot: process.argv[2], consumerDirectory: process.argv[3], stateDirectory: process.argv[4] }); process.stdout.write(candidate.reused ? 'reused' : 'updated');",
      candidateModuleUrl,
      input.repositoryRoot,
      input.consumerDirectory,
      input.stateDirectory
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() === "reused";
}

function candidateManifest(packageDirectory: string): unknown {
  return JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
}

function candidateDependencies(manifest: unknown): unknown {
  if (!isRecord(manifest)) {
    throw new TypeError("candidate manifest must be an object");
  }
  return manifest.dependencies;
}

function runtimeExports(entryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import(process.argv[1]).then((module) => process.stdout.write(JSON.stringify(Object.keys(module).sort())))",
      pathToFileURL(entryPath).href
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
