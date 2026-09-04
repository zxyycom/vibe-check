import { listExampleJson, listSchemaJson, readJson } from "../json/files.ts";
import { walkDocumentationFiles } from "../repository-files.ts";
import { toDocumentationAbsolutePath, toDocumentationRelativePath } from "../repository-paths.ts";
import { expectedDocsValidationFailure } from "../diagnostics.ts";
import { JsonSyntaxError } from "../json/value.ts";
import { CURRENT_SCHEMAS, FILE_SYSTEM, HISTORICAL_SCHEMAS } from "../task-contract.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv,
  createHistoricalSchemaAjv
} from "./registry.ts";

export { validatePublishedMachineArtifactExamples } from "../machine-artifacts/validation.ts";

export function validateJsonSyntax(report?: (message: string) => void): void {
  const jsonFiles = walkDocumentationFiles(
    toDocumentationAbsolutePath(FILE_SYSTEM.docsDir),
    (filePath) => filePath.endsWith(FILE_SYSTEM.jsonExtension)
  );
  const diagnostics = [];
  for (const filePath of jsonFiles) {
    const relativePath = toDocumentationRelativePath(filePath);
    try {
      readJson(relativePath);
    } catch (error: unknown) {
      if (!(error instanceof JsonSyntaxError)) throw error;
      diagnostics.push(
        Object.freeze({
          data: Object.freeze({ kind: "json-syntax-invalid", path: relativePath }),
          id: `json:syntax:${encodeURIComponent(relativePath)}`,
          presentation: `${relativePath}: JSON syntax is invalid.`
        })
      );
    }
  }
  if (diagnostics.length > 0) throw expectedDocsValidationFailure(diagnostics);
  report?.(`json syntax ok: ${jsonFiles.length} file(s)`);
}

export function validateSchemas(report?: (message: string) => void): void {
  const schemaRelPaths = listSchemaJson();
  const expectedSchemas = [...Object.values(CURRENT_SCHEMAS), ...Object.values(HISTORICAL_SCHEMAS)];

  const inventoryDiagnostics = [
    ...expectedSchemas
      .filter((expected) => !schemaRelPaths.includes(expected))
      .map((path) => schemaDiagnostic("schema-missing", path)),
    ...schemaRelPaths
      .filter((schemaRelPath) => !expectedSchemas.includes(schemaRelPath))
      .map((path) => schemaDiagnostic("schema-unregistered", path))
  ];
  if (inventoryDiagnostics.length > 0) throw expectedDocsValidationFailure(inventoryDiagnostics);

  const currentAjv = createCurrentSchemaAjv();
  for (const schemaRelPath of Object.values(CURRENT_SCHEMAS)) {
    compileRegisteredSchema(currentAjv, schemaRelPath);
  }
  const historicalAjv = createHistoricalSchemaAjv();
  for (const schemaRelPath of Object.values(HISTORICAL_SCHEMAS)) {
    compileRegisteredSchema(historicalAjv, schemaRelPath);
  }
  report?.(`schema strict compile ok: ${expectedSchemas.length} schema file(s)`);
}

export function validateReportExamples(report?: (message: string) => void): void {
  const exampleRelPaths = listExampleJson(/^[a-z-]+-report\.json$/);
  if (exampleRelPaths.length === 0) {
    throw expectedDocsValidationFailure([
      schemaDiagnostic("report-example-missing", "docs/examples/json")
    ]);
  }

  const schemaRelPath = HISTORICAL_SCHEMAS.report;
  const ajv = createHistoricalSchemaAjv();
  const validate = compileRegisteredSchema(ajv, schemaRelPath);
  const diagnostics = [];
  for (const exampleRelPath of exampleRelPaths) {
    let example: ReturnType<typeof readJson>;
    try {
      example = readJson(exampleRelPath);
    } catch (error: unknown) {
      if (!(error instanceof JsonSyntaxError)) throw error;
      diagnostics.push(schemaDiagnostic("report-example-json-invalid", exampleRelPath));
      continue;
    }
    if (!validate(example))
      diagnostics.push(schemaDiagnostic("report-example-invalid", exampleRelPath));
  }
  if (diagnostics.length > 0) throw expectedDocsValidationFailure(diagnostics);
  report?.(`schema ok: ${schemaRelPath} (${exampleRelPaths.length} file(s))`);
  report?.(`report examples ok: ${exampleRelPaths.length} file(s)`);
}

function schemaDiagnostic(kind: string, path: string) {
  return Object.freeze({
    data: Object.freeze({ kind, path }),
    id: `schema:${kind}:${encodeURIComponent(path)}`,
    presentation: `${path}: schema validation ${kind.replaceAll("-", " ")}.`
  });
}
