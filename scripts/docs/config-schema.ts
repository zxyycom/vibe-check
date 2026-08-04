#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH,
  serializeSemanticProjectConfigV1EditorSchema
} from "../../src/product/config-schema.ts";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const regenerateCommand = "bun scripts/docs/config-schema.ts";

export function generatePublishedConfigSchema(): void {
  fs.writeFileSync(
    resolvePublishedPath(),
    serializeSemanticProjectConfigV1EditorSchema(),
    "utf8"
  );
}

export function checkPublishedConfigSchema(): void {
  const expected = serializeSemanticProjectConfigV1EditorSchema();
  let actual: string;
  try {
    actual = fs.readFileSync(resolvePublishedPath(), "utf8");
  } catch {
    throw new Error(
      `published config schema is missing: ${SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH}; ` +
      `regenerate with ${regenerateCommand}`
    );
  }
  if (actual !== expected) {
    throw new Error(
      `published config schema drift: ${SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH}; ` +
      `regenerate with ${regenerateCommand}`
    );
  }
}

function resolvePublishedPath(): string {
  return path.join(workspaceRoot, SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH);
}

function isMainModule(): boolean {
  return process.argv[1]
    ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) {
      generatePublishedConfigSchema();
      console.log(`generated config schema: ${SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH}`);
    } else if (args.length === 1 && args[0] === "--check") {
      checkPublishedConfigSchema();
      console.log(`config schema generation current: ${SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH}`);
    } else {
      throw new Error("usage: config-schema.ts [--check]");
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
