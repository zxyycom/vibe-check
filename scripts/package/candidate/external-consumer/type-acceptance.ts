import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertExternalConsumerCommandSucceeded } from "./command-result.ts";
import {
  externalConsumerPublicImports,
  externalConsumerTypecheckConfig
} from "./typecheck-fixture.ts";
import { CURRENT_PUBLIC_CONTRACT } from "../../public-api-inventory.ts";
import { PACKAGE_TYPES_DIRECTORY } from "../../package-contract.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const tsgoPath = resolve(repositoryRoot, "node_modules/@typescript/native-preview/bin/tsgo.js");
const defineCheckDeclarationPath = `${PACKAGE_TYPES_DIRECTORY}/check/check.d.ts`;
const runDeclarationPath = `${PACKAGE_TYPES_DIRECTORY}/project-run/run.d.ts`;

/** Writes declaration fixtures contributed by type acceptance. */
export function writeExternalConsumerTypesFixture(consumerDirectory: string): void {
  // Copy only existing locked declaration dependencies: no runtime ancestor fallback or install.
  const nodeTypesSource = realpathSync(join(repositoryRoot, "node_modules/@types/node"));
  const nodeTypesRequire = createRequire(join(nodeTypesSource, "package.json"));
  const undiciTypesSource = dirname(nodeTypesRequire.resolve("undici-types/package.json"));
  for (const [packageName, source] of [
    ["@types/node", nodeTypesSource],
    ["undici-types", undiciTypesSource]
  ] as const) {
    cpSync(source, join(consumerDirectory, "node_modules", packageName), { recursive: true });
  }
  writeFileSync(
    join(consumerDirectory, "tsconfig.json"),
    externalConsumerTypecheckConfig(CURRENT_PUBLIC_CONTRACT.packageImport),
    "utf8"
  );
  writeFileSync(
    join(consumerDirectory, "public-imports.ts"),
    externalConsumerPublicImports(),
    "utf8"
  );
}

/** Runs public typechecking and audits the installed declaration documentation. */
export function assertExternalConsumerTypes(consumerDirectory: string): void {
  typecheckPublicImports(consumerDirectory);
  assertInstalledDeclarationDocumentation(consumerDirectory);
}

function typecheckPublicImports(consumerDirectory: string): void {
  assert.equal(existsSync(tsgoPath), true, `repository-pinned tsgo is missing at ${tsgoPath}`);
  const result = spawnSync(process.execPath, [tsgoPath, "--project", "tsconfig.json"], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertExternalConsumerCommandSucceeded(result, "isolated public-import typecheck");
}

function assertInstalledDeclarationDocumentation(consumerDirectory: string): void {
  const packageDirectory = join(
    consumerDirectory,
    "node_modules",
    CURRENT_PUBLIC_CONTRACT.packageImport
  );
  const defineCheckDocs = readAdjacentDeclarationDocumentation({
    declarationMarker: `export declare function ${CURRENT_PUBLIC_CONTRACT.operations.defineCheck}<`,
    declarationPath: join(packageDirectory, defineCheckDeclarationPath)
  });
  assert.match(defineCheckDocs, /定义一个 Check/);
  assert.match(defineCheckDocs, /@remarks 此函数负责 authoring inference/);
  assert.match(defineCheckDocs, /run.*负责 Project Definition validation/);
  assert.match(defineCheckDocs, /@example 定义带 options、Records 与 messages 的自定义 Check/);

  const runDocs = readAdjacentDeclarationDocumentation({
    declarationMarker: `export declare function ${CURRENT_PUBLIC_CONTRACT.operations.run}`,
    declarationPath: join(packageDirectory, runDeclarationPath)
  });
  assert.match(runDocs, /在调用方的 Node runtime 中执行/);
  assert.match(runDocs, /@remarks.*validation/su);
  assert.match(runDocs, /@param definition/);
  assert.match(runDocs, /@returns/);
}

function readAdjacentDeclarationDocumentation(input: {
  readonly declarationMarker: string;
  readonly declarationPath: string;
}): string {
  const source = readFileSync(input.declarationPath, "utf8");
  const declarationStart = source.indexOf(input.declarationMarker);
  if (declarationStart === -1) {
    throw new Error(
      `installed declaration is missing ${input.declarationMarker}: ${input.declarationPath}`
    );
  }
  const commentEnd = source.lastIndexOf("*/", declarationStart);
  if (commentEnd === -1) {
    throw new Error(`installed declaration is missing closed JSDoc: ${input.declarationPath}`);
  }
  const commentStart = source.lastIndexOf("/**", commentEnd);
  if (commentStart === -1) {
    throw new Error(`installed declaration is missing JSDoc start: ${input.declarationPath}`);
  }
  const sourceBetweenCommentAndDeclaration = source.slice(commentEnd + 2, declarationStart);
  if (sourceBetweenCommentAndDeclaration.trim().length > 0) {
    throw new Error(`installed declaration JSDoc is not adjacent: ${input.declarationPath}`);
  }
  return source.slice(commentStart, commentEnd + 2);
}
