import {
  listExampleJson,
  listSchemaJson,
  readJson
} from "../json/files.ts";
import { walk } from "../repo/files.ts";
import { toAbs, toRel } from "../repo/paths.ts";
import { assert } from "../assertions.ts";
import {
  FILE_SYSTEM,
  SCHEMAS
} from "../config.ts";
import {
  compileRegisteredSchema,
  createSchemaAjv,
  formatAjvErrors
} from "./registry.ts";

export {
  compileRegisteredSchema,
  createSchemaAjv,
  formatAjvErrors
} from "./registry.ts";

function validateWithSchema(
  ajv: ReturnType<typeof createSchemaAjv>,
  schemaRelPath: string,
  dataRelPaths: string[]
): void {
  const validate = compileRegisteredSchema(ajv, schemaRelPath);
  for (const dataRelPath of dataRelPaths) {
    const data = readJson(dataRelPath);
    if (!validate(data)) {
      throw new Error(`${dataRelPath} failed ${schemaRelPath}: ${formatAjvErrors(validate)}`);
    }
  }
  console.log(`schema ok: ${schemaRelPath} (${dataRelPaths.length} file(s))`);
}

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
  const expectedSchemas = Object.values(SCHEMAS);

  for (const expected of expectedSchemas) {
    assert(schemaRelPaths.includes(expected), `missing expected schema ${expected}`);
  }

  const ajv = createSchemaAjv();
  for (const schemaRelPath of schemaRelPaths) {
    compileRegisteredSchema(ajv, schemaRelPath);
  }
  console.log(`schema strict compile ok: ${schemaRelPaths.length} schema file(s)`);
}

export function validateReportExamples(): void {
  const exampleRelPaths = listExampleJson(/^[a-z-]+\.json$/);
  assert(exampleRelPaths.length > 0, "missing Vibe Check report examples");

  const ajv = createSchemaAjv();
  validateWithSchema(ajv, SCHEMAS.report, exampleRelPaths);
  console.log(`report examples ok: ${exampleRelPaths.length} file(s)`);
}
