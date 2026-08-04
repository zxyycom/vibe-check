import type { TLocalizedValidationError } from "typebox/error";
import Value from "typebox/value";

import {
  ConfigDocumentSchema,
  SemanticProjectConfigV1Schema,
  type SemanticProjectConfigV1
} from "./config-schema.ts";

export function parseSemanticProjectConfigV1(
  input: unknown
): SemanticProjectConfigV1 {
  if (!Value.Check(SemanticProjectConfigV1Schema, input)) {
    throw schemaValidationError(
      Value.Errors(SemanticProjectConfigV1Schema, input)[0]
    );
  }

  const config = structuredClone(input);
  validateTimeZone(config.report.timeZone);
  validateMinimumTokenCodeAreas(config);
  return config;
}

export function parseConfigDocument(input: unknown): SemanticProjectConfigV1 {
  if (!Value.Check(ConfigDocumentSchema, input)) {
    throw schemaValidationError(Value.Errors(ConfigDocumentSchema, input)[0]);
  }

  const { $schema: _schema, ...semanticConfig } = structuredClone(input);
  return parseSemanticProjectConfigV1(semanticConfig);
}

function validateTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
  } catch (cause: unknown) {
    throw new Error("config.report.timeZone must be a valid time zone", { cause });
  }
}

function validateMinimumTokenCodeAreas(config: SemanticProjectConfigV1): void {
  const minimumTokens = config.checks.duplication.minimumTokensByCodeArea;
  for (const codeArea of Object.keys(minimumTokens)) {
    if (Object.hasOwn(config.codeAreas, codeArea)) continue;
    throw new Error(
      `config.checks.duplication.minimumTokensByCodeArea.${codeArea} must reference a declared code area`
    );
  }
}

function schemaValidationError(
  error: TLocalizedValidationError | undefined
): Error {
  if (error === undefined) {
    return new Error("config does not match the semantic project config v1 schema");
  }

  const path = configPath(error.instancePath);
  if (error.keyword === "required") {
    return new Error(`${appendPath(path, error.params.requiredProperties[0])} is required`);
  }
  if (error.keyword === "additionalProperties") {
    return new Error(
      `${appendPath(path, error.params.additionalProperties[0])} is not allowed`
    );
  }
  if (error.keyword === "type" && error.params.type === "number") {
    return new Error(`${path} must be a finite number`);
  }
  return new Error(`${path} ${error.message}`);
}

function configPath(instancePath: string): string {
  if (instancePath.length === 0) return "config";
  return instancePath
    .split("/")
    .slice(1)
    .map(decodePointerSegment)
    .reduce(appendPath, "config");
}

function appendPath(path: string, segment: string | undefined): string {
  if (segment === undefined) return path;
  return /^\d+$/.test(segment) ? `${path}[${segment}]` : `${path}.${segment}`;
}

function decodePointerSegment(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}
