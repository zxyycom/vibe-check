import { listExampleJson, listSchemaJson, readJson } from "../json/files.ts";
import { walk } from "../repo/files.ts";
import { toAbs, toRel } from "../repo/paths.ts";
import { assert } from "../assertions.ts";
import { CURRENT_SCHEMAS, FILE_SYSTEM, HISTORICAL_SCHEMAS } from "../config.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv,
  createHistoricalSchemaAjv,
  formatAjvErrors
} from "./registry.ts";

export { validatePublishedMachineArtifactExamples } from "./machine-artifacts.ts";

export function validateJsonSyntax(): void {
  const jsonFiles = walk(toAbs(FILE_SYSTEM.docsDir), (filePath) =>
    filePath.endsWith(FILE_SYSTEM.jsonExtension)
  );
  for (const filePath of jsonFiles) {
    readJson(toRel(filePath));
  }
  console.log(`json syntax ok: ${jsonFiles.length} file(s)`);
}

export function validateSchemas(): void {
  const schemaRelPaths = listSchemaJson();
  const expectedSchemas = [...Object.values(CURRENT_SCHEMAS), ...Object.values(HISTORICAL_SCHEMAS)];

  for (const expected of expectedSchemas) {
    assert(schemaRelPaths.includes(expected), `missing expected schema ${expected}`);
  }
  for (const schemaRelPath of schemaRelPaths) {
    assert(expectedSchemas.includes(schemaRelPath), `unregistered schema ${schemaRelPath}`);
  }

  const currentAjv = createCurrentSchemaAjv();
  for (const schemaRelPath of Object.values(CURRENT_SCHEMAS)) {
    compileRegisteredSchema(currentAjv, schemaRelPath);
  }
  const historicalAjv = createHistoricalSchemaAjv();
  for (const schemaRelPath of Object.values(HISTORICAL_SCHEMAS)) {
    compileRegisteredSchema(historicalAjv, schemaRelPath);
  }
  console.log(`schema strict compile ok: ${expectedSchemas.length} schema file(s)`);
}

export function validateReportExamples(): void {
  const exampleRelPaths = listExampleJson(/^[a-z-]+-report\.json$/);
  assert(exampleRelPaths.length > 0, "missing Vibe Check report examples");

  const schemaRelPath = HISTORICAL_SCHEMAS.report;
  const ajv = createHistoricalSchemaAjv();
  const validate = compileRegisteredSchema(ajv, schemaRelPath);
  for (const exampleRelPath of exampleRelPaths) {
    if (!validate(readJson(exampleRelPath))) {
      throw new Error(`${exampleRelPath} failed ${schemaRelPath}: ${formatAjvErrors(validate)}`);
    }
  }
  console.log(`schema ok: ${schemaRelPath} (${exampleRelPaths.length} file(s))`);
  console.log(`report examples ok: ${exampleRelPaths.length} file(s)`);
}
