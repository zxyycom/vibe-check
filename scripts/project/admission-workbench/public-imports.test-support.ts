import assert from "node:assert/strict";
import { isAbsolute, relative, resolve } from "node:path";

import ts from "typescript";

import { analyzeModuleSpecifiers } from "../../validation/module-specifier-analysis.ts";

/** Resolves parsed import edges so spelling and directory depth cannot hide Gate/private Product use. */
export function assertWorkbenchPublicImports(
  sourcePath: string,
  source: string,
  options?: ts.CompilerOptions
): number {
  const root = resolve(".");
  const config = ts.readConfigFile(resolve(root, "tsconfig.json"), (path) => ts.sys.readFile(path));
  assert.equal(config.error, undefined);
  const compilerOptions = {
    ...ts.parseJsonConfigFileContent(config.config, ts.sys, root).options,
    ...options
  };
  const analysis = analyzeModuleSpecifiers(source, relative(root, sourcePath));
  assert.deepEqual(analysis.diagnostics, []);
  let publicPackageImports = 0;
  for (const specifier of analysis.moduleSpecifiers) {
    if (specifier.startsWith("node:")) continue;
    if (specifier.startsWith("@zxyycom/vibe-check")) {
      assert.equal(specifier, "@zxyycom/vibe-check", "forbidden workbench import: package subpath");
      publicPackageImports += 1;
    }
    const resolved = ts.resolveModuleName(
      specifier,
      sourcePath,
      compilerOptions,
      ts.sys
    ).resolvedModule;
    assert.ok(resolved, `unresolved workbench import: ${sourcePath} -> ${specifier}`);
    for (const forbidden of ["src", "scripts/project/gate"]) {
      const target = relative(resolve(root, forbidden), resolved.resolvedFileName);
      const outside = target === ".." || target.startsWith("../") || isAbsolute(target);
      assert.ok(outside, `forbidden workbench import: ${sourcePath} -> ${specifier}`);
    }
  }
  return publicPackageImports;
}
