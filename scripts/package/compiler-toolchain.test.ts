import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

import { typecheckInvocation } from "../development/typecheck.ts";
import { plainTextProcessEnv } from "../process-execution/execution.ts";
import { isNonArrayRecord } from "../value-guards.ts";
import { nativeTypeScriptBinPath, typeScriptToolchainFingerprint } from "./compiler-toolchain.ts";

test("stable native compiler and compatibility API retain distinct installed entrypoints", () => {
  const require = createRequire(import.meta.url);
  const compatibilityPath = require.resolve("typescript/package.json");
  const compatibility: unknown = JSON.parse(readFileSync(compatibilityPath, "utf8"));
  assert.ok(isNonArrayRecord(compatibility));
  assert.equal(compatibility.name, "@typescript/typescript6");
  assert.equal(compatibility.version, "6.0.2");
  assert.ok(isNonArrayRecord(compatibility.bin));
  assert.ok(typeof compatibility.bin.tsc6 === "string");
  assert.equal(compatibility.bin.tsc, undefined);
  assert.equal(ts.version, "6.0.3");
  const source = ts.createSourceFile(
    "fixture.ts",
    "export const answer = 42;",
    ts.ScriptTarget.Latest
  );
  assert.equal(source.statements.length, 1);
  const statement = source.statements[0];
  assert.ok(statement !== undefined && ts.isVariableStatement(statement));

  for (const [bin, version] of [
    [nativeTypeScriptBinPath(), "7.0.2"],
    [resolve(dirname(compatibilityPath), compatibility.bin.tsc6), "6.0.3"]
  ] as const) {
    const result = spawnSync(process.execPath, [bin, "--version"], {
      encoding: "utf8",
      env: plainTextProcessEnv()
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `Version ${version}`);
  }
  for (const scope of ["product", "scripts"] as const) {
    const invocation = typecheckInvocation(scope);
    assert.equal(invocation.command, process.execPath);
    assert.deepEqual(invocation.args, [
      nativeTypeScriptBinPath(),
      "-p",
      scope === "product" ? "tsconfig.product.json" : "tsconfig.json"
    ]);
  }
  assert.match(typeScriptToolchainFingerprint(), /^[a-f0-9]{64}$/u);
  assert.equal(typeScriptToolchainFingerprint(), typeScriptToolchainFingerprint());
  assertCompilerBinBoundary();
});

function assertCompilerBinBoundary(): void {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-compiler-bin-"));
  try {
    const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    for (const relativePath of [
      "scripts/package/compiler-toolchain.ts",
      "scripts/value-guards.ts",
      "scripts/repository-files/paths.ts"
    ]) {
      const destination = join(fixtureRoot, relativePath);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(repositoryRoot, relativePath), destination);
    }
    const compilerDirectory = join(fixtureRoot, "node_modules/@typescript/native");
    mkdirSync(join(compilerDirectory, "bin"), { recursive: true });
    const binPath = join(compilerDirectory, "bin/tsc.js");
    writeFileSync(binPath, "// fixture compiler launcher\n");
    const manifestPath = join(compilerDirectory, "package.json");
    const manifest = { name: "typescript", version: "7.0.2", bin: { tsc: "bin/tsc.js" } };
    const resolverUrl = pathToFileURL(join(fixtureRoot, "scripts/package/compiler-toolchain.ts"));
    const resolverSource = `import { nativeTypeScriptBinPath } from ${JSON.stringify(resolverUrl.href)};\nconsole.log(nativeTypeScriptBinPath());`;
    const resolveBin = () =>
      spawnSync(process.execPath, ["--eval", resolverSource], {
        cwd: fixtureRoot,
        encoding: "utf8",
        env: plainTextProcessEnv()
      });
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const valid = resolveBin();
    assert.equal(valid.error, undefined);
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(valid.stdout.trim(), binPath);

    for (const invalidManifest of [
      { ...manifest, name: "unrelated-compiler" },
      { ...manifest, version: "" },
      { ...manifest, version: " 7.0.2" },
      { ...manifest, bin: { tsc: "" } },
      { ...manifest, bin: { tsc: "bin" } },
      { ...manifest, bin: { tsc: "bin/missing.js" } },
      { ...manifest, bin: { tsc: "../outside.js" } }
    ]) {
      writeFileSync(manifestPath, JSON.stringify(invalidManifest));
      const rejected = resolveBin();
      assert.equal(rejected.error, undefined);
      assert.notEqual(rejected.status, 0, JSON.stringify(invalidManifest));
      assert.match(rejected.stderr, /TypeScript (?:toolchain package identity|compiler|tsc bin)/u);
    }
    writeFileSync(manifestPath, "{malformed JSON}");
    const malformed = resolveBin();
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /could not read TypeScript toolchain manifest/u);
    assert.ok(malformed.stderr.includes(manifestPath));
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}
