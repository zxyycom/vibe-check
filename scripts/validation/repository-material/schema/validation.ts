import { listExampleJson, listSchemaJson, readJson } from "../json/files.ts";
import { toDocumentationAbsolutePath } from "../repository-paths.ts";
import { expectedMaterialValidationFailure } from "../diagnostics.ts";
import { JsonSyntaxError } from "../json/value.ts";
import {
  CURRENT_SCHEMAS,
  HISTORICAL_SCHEMAS,
  REPOSITORY_MATERIAL_JSON_MAXIMUM_BYTES
} from "../task-contract.ts";
import { defineConfig, jsonValidation, run } from "../../../../src/index.ts";
import { isNonArrayRecord } from "../../../value-guards.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv,
  createHistoricalSchemaAjv
} from "./registry.ts";

export { validatePublishedMachineArtifactExamples } from "../machine-artifacts/validation.ts";

export async function validateJsonSyntax(
  options: Readonly<{
    readonly report?: (message: string) => void;
    readonly repositoryRoot?: string;
  }> = {}
): Promise<void> {
  const repositoryRoot = options.repositoryRoot ?? toDocumentationAbsolutePath(".");
  const result = await run(
    defineConfig({
      checks: [
        jsonValidation({
          checkId: "repository-material-json-validation",
          files: { include: ["docs/**/*.json"] },
          maximumBytes: REPOSITORY_MATERIAL_JSON_MAXIMUM_BYTES
        })
      ],
      outputs: {
        diagnosticLogging: { enabled: false },
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      }
    }),
    { projectRoot: repositoryRoot }
  );
  if (result.kind !== "completed")
    throw new Error("strict repository JSON validation did not complete");
  const outcome = result.snapshot.checks.find(
    (check) => check.checkId === "repository-material-json-validation"
  )?.outcome;
  if (outcome?.status === "passed") {
    const scannedFileCount = readScannedFileCount(outcome.data);
    options.report?.(`strict JSON validation ok: ${scannedFileCount} file(s)`);
    return;
  }
  if (outcome?.status !== "failed")
    throw new Error("strict repository JSON validation did not produce a final result");
  throw expectedMaterialValidationFailure(
    result.snapshot.records
      .filter((record) => record.checkId === "repository-material-json-validation")
      .map((record) => strictJsonDiagnostic(record.id, record.data))
  );
}

function readScannedFileCount(data: unknown): number {
  const scannedFileCount = isNonArrayRecord(data) ? data.scannedFileCount : undefined;
  if (
    !isNonArrayRecord(data) ||
    !Object.hasOwn(data, "scannedFileCount") ||
    typeof scannedFileCount !== "number" ||
    !Number.isSafeInteger(scannedFileCount)
  ) {
    throw new Error("strict repository JSON validation returned invalid final data");
  }
  return scannedFileCount;
}

function strictJsonDiagnostic(id: string, data: unknown) {
  if (!isNonArrayRecord(data) || typeof data.path !== "string" || typeof data.reason !== "string") {
    throw new Error("strict repository JSON validation returned invalid Record data");
  }
  const { path, reason } = data;
  return Object.freeze({
    data: Object.freeze({
      kind: "strict-json-invalid",
      path,
      reason
    }),
    id: `json:strict:${encodeURIComponent(id)}`,
    presentation: `${path}: strict JSON validation ${reason}.`
  });
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
  if (inventoryDiagnostics.length > 0)
    throw expectedMaterialValidationFailure(inventoryDiagnostics);

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
    throw expectedMaterialValidationFailure([
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
  if (diagnostics.length > 0) throw expectedMaterialValidationFailure(diagnostics);
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
