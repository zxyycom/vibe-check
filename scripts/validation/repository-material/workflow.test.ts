import assert from "node:assert/strict";
import test from "node:test";

import { createMaterialValidationCheck } from "../../project/gate/checks/materials-validation.ts";
import {
  expectedMaterialValidationFailure,
  type MaterialValidationDiagnostic
} from "./diagnostics.ts";
import { validateRepositoryMaterials, type MaterialValidationResult } from "./workflow.ts";

type DependencyNotDeclaredResult = Readonly<{
  readonly ok: false;
  readonly error: Readonly<{ readonly code: "dependency-not-declared"; readonly checkId: string }>;
}>;

test("material validation library reports success only through an explicit reporter", async () => {
  const directConsoleMessages: string[] = [];
  const reportedMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]): void => {
    directConsoleMessages.push(values.map(String).join(" "));
  };
  try {
    const silent = await validateRepositoryMaterials({ tasks: ["examples"] });
    const reported = await validateRepositoryMaterials({
      tasks: ["examples"],
      report: (message) => reportedMessages.push(message)
    });
    assert.equal(silent.status, "passed");
    assert.equal(reported.status, "passed");
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(directConsoleMessages, []);
  assert.match(reportedMessages.join("\n"), /current machine artifact examples ok: 1 set\(s\)/);
  assert.match(reportedMessages.join("\n"), /report examples ok:/);
});

test("material validation returns typed expected failures and keeps the Gate path console-silent", async () => {
  const failure = expectedMaterialValidationFailure([
    {
      data: {
        kind: "missing-local-link",
        location: { column: 1, line: 1 },
        occurrence: 1,
        sourcePath: "docs/typed-validation-link-fixture.md",
        targetPath: "docs/missing-target.md"
      },
      id: "missing-local-link:docs%2Ftyped-validation-link-fixture.md:1:1:1",
      presentation:
        "docs/typed-validation-link-fixture.md:1:1 missing local Markdown link target: docs/missing-target.md."
    }
  ]);
  const workflowResult: MaterialValidationResult = Object.freeze({
    diagnostics: failure.diagnostics,
    status: "failed"
  });
  const diagnostic = failure.diagnostics[0];
  if (diagnostic === undefined) throw new Error("fixture must have one typed diagnostic");
  const check = createMaterialValidationCheck({
    checkId: "materials-links-validator",
    displayName: "Repository material link validation",
    focusedCommand: "bun run validate -- materials links",
    validate: async () => workflowResult
  });
  const invocation = await invokeMaterialValidationCheck(check, "fixture/materials-validation");
  assert.deepEqual(jsonRoundTrip(invocation.records), [
    {
      data: jsonRoundTrip(diagnostic.data),
      identity: { id: "missing-local-link:docs%2Ftyped-validation-link-fixture.md:1:1:1" }
    }
  ]);
  assert.deepEqual(jsonRoundTrip(invocation.result), {
    data: {
      diagnosticCode: "materials-links-validator-invalid",
      diagnosticCount: 1,
      outcome: "failed"
    },
    messages: [
      {
        code: "materials-links-validator-invalid",
        level: "error",
        message: "Run: bun run validate -- materials links."
      }
    ],
    status: "failed"
  });
});

test("material direct validation fails closed while the Gate adapter projects its safe Record subset", async () => {
  assert.throws(
    () => expectedMaterialValidationFailure([]),
    /Repository material validation diagnostics are invalid/
  );
  const noncanonicalData: MaterialValidationDiagnostic["data"] = { kind: "fixture" };
  Object.defineProperty(noncanonicalData, "unsafe", { enumerable: true, value: undefined });
  assert.throws(
    () =>
      expectedMaterialValidationFailure([
        {
          data: noncanonicalData,
          id: "fixture:noncanonical-data",
          presentation: "fixture diagnostic."
        }
      ]),
    /Repository material validation diagnostics are invalid/
  );
  const duplicate: MaterialValidationDiagnostic = {
    data: { kind: "fixture" },
    id: "fixture:duplicate",
    presentation: "fixture diagnostic."
  };
  assert.throws(
    () => expectedMaterialValidationFailure([duplicate, duplicate]),
    /Repository material validation diagnostics are invalid/
  );

  assert.throws(
    () =>
      expectedMaterialValidationFailure([
        {
          data: { kind: "fixture" },
          id: "fixture:unsafe-presentation",
          presentation: "unsafe\npresentation"
        }
      ]),
    /Repository material validation diagnostics are invalid/
  );

  const unsafeResult: MaterialValidationResult = {
    diagnostics: [
      {
        data: { kind: "fixture" },
        id: "fixture:unsafe-presentation",
        presentation: "unsafe\npresentation"
      }
    ],
    status: "failed"
  };
  const check = createMaterialValidationCheck({
    checkId: "materials-links-validator",
    displayName: "Repository material link validation",
    focusedCommand: "bun run validate -- materials links",
    validate: async () => unsafeResult
  });
  const invocation = await invokeMaterialValidationCheck(
    check,
    "fixture/materials-validation-unsafe"
  );
  assert.deepEqual(jsonRoundTrip(invocation.result), {
    data: {
      diagnosticCode: "materials-links-validator-invalid",
      diagnosticCount: 1,
      outcome: "failed"
    },
    messages: [
      {
        code: "materials-links-validator-invalid",
        level: "error",
        message: "Run: bun run validate -- materials links."
      }
    ],
    status: "failed"
  });
  assert.deepEqual(jsonRoundTrip(invocation.records), [
    {
      data: { kind: "fixture" },
      identity: { id: "fixture:unsafe-presentation" }
    }
  ]);
  assert.equal(Object.getPrototypeOf(invocation.records[0]?.data), null);
});

function jsonRoundTrip(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

async function invokeMaterialValidationCheck(
  check: ReturnType<typeof createMaterialValidationCheck>,
  invocationId: string
) {
  if (check.execute === undefined)
    throw new Error("Repository material Check has no execution callback");
  const records: Array<
    Readonly<{ readonly data: object; readonly identity: { readonly id: string } }>
  > = [];
  const result = await check.execute({
    artifactDirectory: null,
    dependencies: {
      get: dependencyNotDeclared,
      list: () => Object.freeze([])
    },
    invocationId,
    options: {},
    project: { flags: [], root: process.cwd() },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal: new AbortController().signal
  });
  return Object.freeze({ records, result });
}

function dependencyNotDeclared<Id extends string>(
  provider: Readonly<{ readonly checkId: Id; readonly handoff: unknown }>
): DependencyNotDeclaredResult;
function dependencyNotDeclared(checkId: string): DependencyNotDeclaredResult;
function dependencyNotDeclared(
  dependency: Readonly<{ readonly checkId: string }> | string
): DependencyNotDeclaredResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "dependency-not-declared" as const,
      checkId: typeof dependency === "string" ? dependency : dependency.checkId
    })
  });
}
