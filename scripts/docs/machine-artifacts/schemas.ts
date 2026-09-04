#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MACHINE_RECORD_V4_SCHEMA,
  MACHINE_RUN_V4_SCHEMA
} from "../../../src/machine-output/v4/schema.ts";
import {
  MACHINE_RECORD_V4_SCHEMA_PATH,
  MACHINE_RUN_V4_SCHEMA_PATH
} from "../../../src/machine-output/v4/schema-identities.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const regenerateCommand = "bun scripts/docs/machine-artifacts/schemas.ts";

/** A safe, provider-owned reason that docs validation may project without reading error text. */
export class MachineSchemaPublicationFailure extends Error {
  public readonly kind: string;
  public readonly path: string;

  public constructor(kind: string, repositoryPath: string) {
    super(`${repositoryPath}: ${kind.replaceAll("-", " ")}; regenerate with ${regenerateCommand}.`);
    this.kind = kind;
    this.name = "MachineSchemaPublicationFailure";
    this.path = repositoryPath;
  }
}

const publishedSchemas = [
  {
    path: MACHINE_RUN_V4_SCHEMA_PATH,
    schema: MACHINE_RUN_V4_SCHEMA
  },
  {
    path: MACHINE_RECORD_V4_SCHEMA_PATH,
    schema: MACHINE_RECORD_V4_SCHEMA
  }
] as const;

export function generatePublishedMachineSchemas(): void {
  for (const publishedSchema of publishedSchemas) {
    fs.writeFileSync(
      resolvePublishedPath(publishedSchema.path),
      serializeSchema(publishedSchema.schema),
      "utf8"
    );
  }
}

export function checkPublishedMachineSchemas(): void {
  for (const publishedSchema of publishedSchemas) {
    const expected = serializeSchema(publishedSchema.schema);
    let actual: string;
    try {
      actual = fs.readFileSync(resolvePublishedPath(publishedSchema.path), "utf8");
    } catch (error: unknown) {
      if (!isMissingFile(error)) throw error;
      throw machineSchemaFailure("published-schema-missing", publishedSchema.path);
    }
    if (actual !== expected) {
      throw machineSchemaFailure("published-schema-drift", publishedSchema.path);
    }
  }
}

function serializeSchema(schema: unknown): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

function resolvePublishedPath(relativePath: string): string {
  return path.join(workspaceRoot, relativePath);
}

function machineSchemaFailure(kind: string, relativePath: string): MachineSchemaPublicationFailure {
  return new MachineSchemaPublicationFailure(kind, relativePath);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ readonly code?: unknown }>).code === "ENOENT"
  );
}

function isMainModule(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) {
      generatePublishedMachineSchemas();
      console.log(`generated machine schemas: ${publishedSchemas.length} file(s)`);
    } else if (args.length === 1 && args[0] === "--check") {
      checkPublishedMachineSchemas();
      console.log(`machine schema generation current: ${publishedSchemas.length} file(s)`);
    } else {
      throw new Error("usage: machine-artifacts/schemas.ts [--check]");
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
