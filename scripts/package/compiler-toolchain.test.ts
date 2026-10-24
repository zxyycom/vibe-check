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
  const fingerprint = typeScriptToolchainFingerprint();
  assert.match(fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(typeScriptToolchainFingerprint(), fingerprint);
  assertIsolatedToolchainBoundary();
});

function assertIsolatedToolchainBoundary(): void {
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
    const binPath = join(compilerDirectory, "bin/tsc.js");
    const manifestPath = join(compilerDirectory, "package.json");
    const platformName = `@typescript/typescript-${process.platform}-${process.arch}`;
    const platformDirectory = join(compilerDirectory, "node_modules", platformName);
    const compatibilityDirectory = join(fixtureRoot, "node_modules/typescript");
    const apiDirectory = join(compatibilityDirectory, "node_modules/@typescript/old");
    const manifest = {
      name: "typescript",
      version: "7.0.2",
      bin: { tsc: "bin/tsc.js" },
      optionalDependencies: { [platformName]: "7.0.2" }
    };
    // Only resolution metadata and opaque bytes are needed: this fixture never executes
    // a compiler or API. Nested packages also require the owning manifest's resolver.
    const materials = [
      [manifestPath, JSON.stringify(manifest)],
      [binPath, "// fixture compiler bin\n"],
      [join(compilerDirectory, "lib/tsc.js"), "// fixture compiler runner\n"],
      [join(compilerDirectory, "lib/getExePath.js"), "// fixture platform resolver\n"],
      [
        join(platformDirectory, "package.json"),
        JSON.stringify({ name: platformName, version: "7.0.2" })
      ],
      [
        join(platformDirectory, "lib", process.platform === "win32" ? "tsc.exe" : "tsc"),
        "fixture native executable\n"
      ],
      [
        join(compatibilityDirectory, "package.json"),
        JSON.stringify({
          name: "@typescript/typescript6",
          version: "6.0.2",
          main: "lib/typescript.js"
        })
      ],
      [join(compatibilityDirectory, "lib/typescript.js"), "// fixture compatibility API\n"],
      [join(compatibilityDirectory, "lib/typescript.d.ts"), "// fixture compatibility types\n"],
      [
        join(apiDirectory, "package.json"),
        JSON.stringify({ name: "typescript", version: "6.0.3", main: "lib/typescript.js" })
      ],
      [join(apiDirectory, "lib/typescript.js"), "// fixture actual API\n"],
      [join(apiDirectory, "lib/typescript.d.ts"), "// fixture actual types\n"]
    ] as const;
    for (const [path, contents] of materials) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents);
    }
    const resolverUrl = pathToFileURL(join(fixtureRoot, "scripts/package/compiler-toolchain.ts"));
    const invalidManifests = [
      { ...manifest, name: "unrelated-compiler" },
      { ...manifest, version: "" },
      { ...manifest, version: " 7.0.2" },
      { ...manifest, bin: { tsc: "" } },
      { ...manifest, bin: { tsc: "bin" } },
      { ...manifest, bin: { tsc: "bin/missing.js" } },
      { ...manifest, bin: { tsc: "../outside.js" } }
    ];
    // Keep module resolution isolated, but exercise manifest reads in one child rather
    // than paying a fresh runtime startup for each mutation of the same fixture.
    const matrixSource = `
      import assert from "node:assert/strict";
      import { readFileSync, writeFileSync } from "node:fs";
      import {
        nativeTypeScriptBinPath,
        typeScriptToolchainFingerprint
      } from ${JSON.stringify(resolverUrl.href)};
      const manifestPath = ${JSON.stringify(manifestPath)};
      const manifest = ${JSON.stringify(manifest)};
      const resolveValid = () => {
        writeFileSync(manifestPath, JSON.stringify(manifest));
        assert.equal(nativeTypeScriptBinPath(), ${JSON.stringify(binPath)});
      };
      resolveValid();
      for (const invalidManifest of ${JSON.stringify(invalidManifests)}) {
        writeFileSync(manifestPath, JSON.stringify(invalidManifest));
        assert.throws(
          () => nativeTypeScriptBinPath(),
          /TypeScript (?:toolchain package identity|compiler|tsc bin)/u,
          JSON.stringify(invalidManifest)
        );
      }
      writeFileSync(manifestPath, "{malformed JSON}");
      assert.throws(() => nativeTypeScriptBinPath(), (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /could not read TypeScript toolchain manifest/u);
        assert.ok(error.message.includes(manifestPath));
        return true;
      });
      resolveValid();
      const fingerprint = typeScriptToolchainFingerprint();
      assert.match(fingerprint, /^[a-f0-9]{64}$/u);
      for (const path of ${JSON.stringify(materials.map(([path]) => path))}) {
        const original = readFileSync(path);
        try {
          // Whitespace preserves manifest identity/version while changing raw bytes.
          writeFileSync(path, Buffer.concat([original, Buffer.from("\\n")]));
          assert.notEqual(typeScriptToolchainFingerprint(), fingerprint, path);
        } finally {
          writeFileSync(path, original);
        }
        assert.equal(typeScriptToolchainFingerprint(), fingerprint, path);
      }
    `;
    const matrix = spawnSync(process.execPath, ["--eval", matrixSource], {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: plainTextProcessEnv()
    });
    assert.equal(matrix.error, undefined);
    assert.equal(matrix.status, 0, matrix.stderr);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}
