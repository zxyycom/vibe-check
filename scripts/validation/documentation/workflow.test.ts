import assert from "node:assert/strict";
import test from "node:test";

import { createDocsValidationCheck } from "../../project/gate/checks/docs-validation.ts";
import { expectedDocsValidationFailure, type DocsValidationDiagnostic } from "./diagnostics.ts";
import { validateDocs, type DocsValidationResult } from "./workflow.ts";

test("docs validation library reports success only through an explicit reporter", async () => {
  const directConsoleMessages: string[] = [];
  const reportedMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]): void => {
    directConsoleMessages.push(values.map(String).join(" "));
  };
  try {
    const silent = await validateDocs({ tasks: ["examples"] });
    const reported = await validateDocs({
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

test("docs validation returns typed expected failures and keeps the Gate path console-silent", async () => {
  const failure = expectedDocsValidationFailure([
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
  const workflowResult: DocsValidationResult = Object.freeze({
    diagnostics: failure.diagnostics,
    status: "failed"
  });
  const diagnostic = failure.diagnostics[0];
  if (diagnostic === undefined) throw new Error("fixture must have one typed diagnostic");
  const check = createDocsValidationCheck(
    {
      checkId: "docs-links-validator",
      displayName: "Documentation path existence validation",
      task: "links"
    },
    {
      validateDocs: async (options) => {
        assert.deepEqual(options, { tasks: ["links"] });
        return workflowResult;
      }
    }
  );
  const invocation = await invokeDocsValidationCheck(check, "fixture/docs-validation");
  assert.deepEqual(invocation.records, [
    {
      data: diagnostic.data,
      identity: { id: "missing-local-link:docs%2Ftyped-validation-link-fixture.md:1:1:1" }
    }
  ]);
  assert.deepEqual(invocation.result, {
    data: {
      diagnosticCode: "docs-links-validator-invalid",
      diagnosticCount: 1,
      outcome: "failed"
    },
    messages: [
      {
        code: "docs-links-validator-invalid",
        level: "error",
        message:
          "docs/typed-validation-link-fixture.md:1:1 missing local Markdown link target: docs/missing-target.md."
      },
      {
        code: "docs-links-validator-invalid",
        level: "error",
        message: "Run: bun run validate -- docs links."
      }
    ],
    status: "failed"
  });
});

test("docs diagnostics fail closed before direct CLI or Gate presentation", async () => {
  assert.throws(
    () => expectedDocsValidationFailure([]),
    /Documentation validation diagnostics are invalid/
  );
  const noncanonicalData: DocsValidationDiagnostic["data"] = { kind: "fixture" };
  Object.defineProperty(noncanonicalData, "unsafe", { enumerable: true, value: undefined });
  assert.throws(
    () =>
      expectedDocsValidationFailure([
        {
          data: noncanonicalData,
          id: "fixture:noncanonical-data",
          presentation: "fixture diagnostic."
        }
      ]),
    /Documentation validation diagnostics are invalid/
  );
  const duplicate: DocsValidationDiagnostic = {
    data: { kind: "fixture" },
    id: "fixture:duplicate",
    presentation: "fixture diagnostic."
  };
  assert.throws(
    () => expectedDocsValidationFailure([duplicate, duplicate]),
    /Documentation validation diagnostics are invalid/
  );

  assert.throws(
    () =>
      expectedDocsValidationFailure([
        {
          data: { kind: "fixture" },
          id: "fixture:unsafe-presentation",
          presentation: "unsafe\npresentation"
        }
      ]),
    /Documentation validation diagnostics are invalid/
  );

  const unsafeResult: DocsValidationResult = {
    diagnostics: [
      {
        data: { kind: "fixture" },
        id: "fixture:unsafe-presentation",
        presentation: "unsafe\npresentation"
      }
    ],
    status: "failed"
  };
  const check = createDocsValidationCheck(
    {
      checkId: "docs-links-validator",
      displayName: "Documentation path existence validation",
      task: "links"
    },
    {
      validateDocs: async () => unsafeResult
    }
  );
  const invocation = await invokeDocsValidationCheck(check, "fixture/docs-validation-unsafe");
  assert.deepEqual(invocation.result, {
    status: "unavailable",
    reason: { code: "native-operation-unavailable" }
  });
  assert.deepEqual(invocation.records, []);
});

async function invokeDocsValidationCheck(
  check: ReturnType<typeof createDocsValidationCheck>,
  invocationId: string
) {
  if (check.execution === undefined) throw new Error("Docs Check has no execution callback");
  const records: Array<
    Readonly<{ readonly data: object; readonly identity: { readonly id: string } }>
  > = [];
  const result = await check.execution({
    artifactDirectory: null,
    dependencies: {
      get: (checkId: string) => ({
        ok: false,
        error: { code: "dependency-not-declared", checkId }
      }),
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
