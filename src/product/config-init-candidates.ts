import { isDeepStrictEqual } from "node:util";
import Compile from "typebox/compile";

import { NeutralProjectConfig } from "./config.ts";
import { CONFIG_SCHEMA_REFERENCE } from "./config-paths.ts";
import {
  ConfigDocumentSchema,
  type ConfigDocument
} from "./config-schema.ts";
import { parseConfigDocument } from "./config-validation.ts";

const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const TEXT_ENCODER = new TextEncoder();
const CONFIG_DOCUMENT_EDITOR_SCHEMA = {
  $schema: JSON_SCHEMA_2020_12,
  ...ConfigDocumentSchema
} as const;
const CONFIG_DOCUMENT_EDITOR_VALIDATOR = Compile(
  CONFIG_DOCUMENT_EDITOR_SCHEMA
);

export interface ConfigInitCandidates {
  readonly configBytes: Uint8Array;
  readonly schemaBytes: Uint8Array;
}

export function createConfigInitCandidates(): ConfigInitCandidates {
  const document = createNeutralConfigDocument();
  const configSource = serializeCommentedConfig(document);
  const schemaSource = `${JSON.stringify(CONFIG_DOCUMENT_EDITOR_SCHEMA, null, 2)}\n`;
  validateGeneratedCandidates(configSource, schemaSource);
  return {
    configBytes: TEXT_ENCODER.encode(configSource),
    schemaBytes: TEXT_ENCODER.encode(schemaSource)
  };
}

function createNeutralConfigDocument(): ConfigDocument {
  return {
    $schema: CONFIG_SCHEMA_REFERENCE,
    ...structuredClone(NeutralProjectConfig)
  };
}

function serializeCommentedConfig(document: ConfigDocument): string {
  return [
    "{",
    ...serializeProperty("$schema", document.$schema),
    ...serializeProperty("version", document.version),
    "",
    "  // Scope selects project files and assigns them to code areas.",
    ...serializeProperty("include", document.include),
    ...serializeProperty("excludeDirs", document.excludeDirs),
    ...serializeProperty("generatedFiles", document.generatedFiles),
    ...serializeProperty("codeAreas", document.codeAreas),
    "",
    "  // Checks define quality thresholds and reviewed warning acceptances.",
    ...serializeProperty("checks", document.checks),
    ...serializeProperty("acceptedWarnings", document.acceptedWarnings),
    "",
    "  // Report settings control the human-readable quality summary.",
    ...serializeProperty("report", document.report),
    "",
    "  // Output paths are relative to the project root.",
    ...serializeProperty("artifactDir", document.artifactDir),
    ...serializeProperty("cacheDir", document.cacheDir, false),
    "}",
    ""
  ].join("\n");
}

function serializeProperty(
  name: string,
  value: unknown,
  trailingComma = true
): string[] {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) {
    throw new Error(`cannot serialize generated config property ${name}`);
  }
  const [firstLine = "", ...remainingLines] = serialized.split("\n");
  const lines = [
    `  ${JSON.stringify(name)}: ${firstLine}`,
    ...remainingLines.map((line) => `  ${line}`)
  ];
  if (trailingComma) lines[lines.length - 1] += ",";
  return lines;
}

function validateGeneratedCandidates(
  configSource: string,
  schemaSource: string
): void {
  validateTextCandidate("config", configSource);
  validateTextCandidate("schema", schemaSource);

  const document = parseVibeCheckJson(configSource);
  const parsedConfig = parseConfigDocument(document);
  if (!isDeepStrictEqual(parsedConfig, NeutralProjectConfig)) {
    throw new Error("generated config does not equal the neutral project config");
  }

  const schema = JSON.parse(schemaSource) as unknown;
  if (!isDeepStrictEqual(schema, CONFIG_DOCUMENT_EDITOR_SCHEMA)) {
    throw new Error("generated editor schema drifted from its composed source");
  }
  if (!CONFIG_DOCUMENT_EDITOR_VALIDATOR.Check(document)) {
    throw new Error("generated editor schema does not validate generated config");
  }
}

function validateTextCandidate(label: string, source: string): void {
  if (!source.endsWith("\n") || source.includes("\r")) {
    throw new Error(`${label} candidate must use LF with a trailing newline`);
  }
  const bytes = TEXT_ENCODER.encode(source);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded !== source) {
    throw new Error(`${label} candidate is not stable UTF-8`);
  }
}

function parseVibeCheckJson(source: string): unknown {
  const bun = globalThis as typeof globalThis & {
    readonly Bun: {
      readonly JSONC: {
        parse(input: string): unknown;
      };
    };
  };
  return bun.Bun.JSONC.parse(source);
}
