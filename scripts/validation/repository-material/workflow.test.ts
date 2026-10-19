import type { CheckExecutionContext } from "../../../src/index.ts";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import test from "node:test";

import { MachineExamplePublicationFailure } from "../../docs/machine-artifacts/examples/publication.ts";
import { MachineSchemaPublicationFailure } from "../../docs/machine-artifacts/schemas.ts";
import { createMaterialValidationCheck } from "../../project/gate/checks/materials-validation.ts";
import {
  expectedMaterialValidationFailure,
  type MaterialValidationDiagnostic
} from "./diagnostics.ts";
import {
  runMaterialValidationCli,
  validateRepositoryMaterials,
  type MaterialValidationResult
} from "./workflow.ts";

type DependencyNotDeclaredResult = Readonly<{
  readonly ok: false;
  readonly error: Readonly<{ readonly code: "dependency-not-declared"; readonly checkId: string }>;
}>;

test("material workflow dispatches all default tasks and awaits asynchronous validators", async () => {
  const calls: string[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const jsonCompletion = Promise.withResolvers<void>();
  const exampleCompletion = Promise.withResolvers<void>();
  const validators = recordingValidators(calls);
  let completed = false;
  const pending = runMaterialValidationCli(
    {
      argv: [],
      writeStdout: (message) => stdout.push(message),
      writeStderr: (message) => stderr.push(message)
    },
    {
      ...validators,
      validateJsonSyntax: async (options) => {
        await validators.validateJsonSyntax(options);
        await jsonCompletion.promise;
      },
      checkPublishedMachineExamples: async () => {
        await validators.checkPublishedMachineExamples();
        await exampleCompletion.promise;
      }
    }
  ).then((exitCode) => {
    completed = true;
    return exitCode;
  });

  try {
    await setImmediate();
    assert.equal(completed, false);
    assert.deepEqual(calls, ["json"]);
    jsonCompletion.resolve();
    await setImmediate();
    assert.equal(completed, false);
    assert.deepEqual(calls, [
      "json",
      "schema-publication",
      "schemas",
      "machine-artifacts",
      "example-publication"
    ]);
    assert.deepEqual(stdout, ["fixture JSON ok", "fixture schemas ok"]);
  } finally {
    jsonCompletion.resolve();
    exampleCompletion.resolve();
    await pending;
  }

  assert.equal(await pending, 0);
  assert.deepEqual(calls, [
    "json",
    "schema-publication",
    "schemas",
    "machine-artifacts",
    "example-publication",
    "report-examples",
    "links",
    "package-api-documentation"
  ]);
  assert.deepEqual(stdout, [
    "fixture JSON ok",
    "fixture schemas ok",
    "current machine artifact examples ok: 2 set(s)",
    "fixture reports ok",
    "fixture links ok"
  ]);
  assert.deepEqual(stderr, []);
});

test("material workflow deduplicates focused selections without broadening them", async () => {
  const calls: string[] = [];
  const validators = recordingValidators(calls);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runMaterialValidationCli(
    {
      argv: ["links", "json", "links", "package-api-documentation", "json"],
      linkRepositoryRoot: "/fixture/material-root",
      writeStdout: (message) => stdout.push(message),
      writeStderr: (message) => stderr.push(message)
    },
    {
      ...validators,
      validateMarkdownLinks: (options) => {
        assert.equal(options?.repositoryRoot, "/fixture/material-root");
        validators.validateMarkdownLinks(options);
      }
    }
  );
  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ["links", "json", "package-api-documentation"]);
  assert.deepEqual(stdout, ["fixture links ok", "fixture JSON ok"]);
  assert.deepEqual(stderr, []);
});

test("material validation library reports success only through an explicit reporter", async () => {
  const directConsoleMessages: string[] = [];
  const reportedMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]): void => {
    directConsoleMessages.push(values.map(String).join(" "));
  };
  try {
    const validators = recordingValidators([]);
    const silent = await validateRepositoryMaterials({}, validators);
    const reported = await validateRepositoryMaterials(
      {
        report: (message) => reportedMessages.push(message)
      },
      validators
    );
    assert.equal(silent.status, "passed");
    assert.equal(reported.status, "passed");
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(directConsoleMessages, []);
  assert.deepEqual(reportedMessages, [
    "fixture JSON ok",
    "fixture schemas ok",
    "current machine artifact examples ok: 2 set(s)",
    "fixture reports ok",
    "fixture links ok"
  ]);
});

test("material workflow aggregates expected failures and continues selected tasks", async () => {
  const jsonFailure = expectedMaterialValidationFailure([
    { data: { kind: "fixture-json" }, id: "json:fixture", presentation: "fixture JSON invalid." }
  ]);
  const schemaFailure = new MachineSchemaPublicationFailure(
    "published-schema-drift",
    "docs/schema.json"
  );
  const exampleFailure = new MachineExamplePublicationFailure(
    "published-machine-example-drift",
    "docs/example.json"
  );
  const calls: string[] = [];
  const validators = {
    ...recordingValidators(calls),
    validateJsonSyntax: async () => {
      calls.push("json");
      throw jsonFailure;
    },
    checkPublishedMachineSchemas: () => {
      calls.push("schema-publication");
      throw schemaFailure;
    },
    checkPublishedMachineExamples: async () => {
      calls.push("example-publication");
      throw exampleFailure;
    }
  };
  const reportedMessages: string[] = [];
  const result = await validateRepositoryMaterials(
    { report: (message) => reportedMessages.push(message) },
    validators
  );
  assert.deepEqual(jsonRoundTrip(result), {
    status: "failed",
    diagnostics: [
      { data: { kind: "fixture-json" }, id: "json:fixture", presentation: "fixture JSON invalid." },
      {
        data: { kind: "published-schema-drift", path: "docs/schema.json" },
        id: "machine-schema:published-schema-drift:docs%2Fschema.json",
        presentation: schemaFailure.message
      },
      {
        data: { kind: "published-machine-example-drift", path: "docs/example.json" },
        id: "machine-example:published-machine-example-drift:docs%2Fexample.json",
        presentation: exampleFailure.message
      }
    ]
  });
  assert.deepEqual(calls, [
    "json",
    "schema-publication",
    "machine-artifacts",
    "example-publication",
    "links",
    "package-api-documentation"
  ]);
  assert.deepEqual(reportedMessages, ["fixture links ok"]);

  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runMaterialValidationCli(
    {
      argv: [],
      writeStdout: (message) => stdout.push(message),
      writeStderr: (message) => stderr.push(message)
    },
    validators
  );
  assert.equal(exitCode, 1);
  assert.deepEqual(stderr, [
    "fixture JSON invalid.",
    schemaFailure.message,
    exampleFailure.message
  ]);
  assert.deepEqual(stdout, ["fixture links ok"]);
});

test("material workflow propagates unexpected failures instead of returning success", async () => {
  const failure = new Error("fixture I/O failure");
  const base = recordingValidators([]);
  for (const validators of [
    {
      ...base,
      validateJsonSyntax: async () => {
        throw failure;
      }
    },
    {
      ...base,
      checkPublishedMachineSchemas: () => {
        throw failure;
      }
    },
    {
      ...base,
      checkPublishedMachineExamples: async () => {
        throw failure;
      }
    }
  ]) {
    await assert.rejects(
      () => validateRepositoryMaterials({}, validators),
      (error) => error === failure
    );
  }
  await assert.rejects(
    () =>
      validateRepositoryMaterials(
        { tasks: ["package-api-documentation"] },
        {
          ...base,
          runPackageApiDocumentationCli: () => ({
            exitCode: 1,
            diagnostics: ["fixture projection drift"]
          })
        }
      ),
    /fixture projection drift/
  );
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

function recordingValidators(
  calls: string[]
): NonNullable<Parameters<typeof validateRepositoryMaterials>[1]> {
  return {
    validateJsonSyntax: async (options) => {
      calls.push("json");
      options?.report?.("fixture JSON ok");
    },
    checkPublishedMachineSchemas: () => {
      calls.push("schema-publication");
    },
    validateSchemas: (report) => {
      calls.push("schemas");
      report?.("fixture schemas ok");
    },
    validatePublishedMachineArtifactExamples: () => {
      calls.push("machine-artifacts");
      return 2;
    },
    checkPublishedMachineExamples: async () => {
      calls.push("example-publication");
    },
    validateReportExamples: (report) => {
      calls.push("report-examples");
      report?.("fixture reports ok");
    },
    validateMarkdownLinks: (options) => {
      calls.push("links");
      options?.report?.("fixture links ok");
    },
    runPackageApiDocumentationCli: (argv) => {
      assert.deepEqual(argv, ["--check"]);
      calls.push("package-api-documentation");
      return { exitCode: 0, diagnostics: [] };
    }
  };
}

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
  const context: CheckExecutionContext = {
    artifactDirectory: null,
    dependencies: {
      get: dependencyNotDeclared,
      list: () => Object.freeze([])
    },
    invocationId,
    project: { flags: [], root: process.cwd() },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal: new AbortController().signal
  };
  const execute = check.execute;
  const invocation: unknown = Reflect.apply(
    typeof execute === "function" ? execute : execute.callback,
    undefined,
    [
      {},
      typeof execute === "function"
        ? Object.freeze({})
        : Object.freeze(
            Object.fromEntries((execute.contextNeeds ?? []).map((key) => [key, context[key]]))
          )
    ]
  );
  const result = await invocation;
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
