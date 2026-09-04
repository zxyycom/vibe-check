import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createNativeOperationCheck, type NativeOperationResult } from "./native-operation.ts";
import { invokeCheck, invokeCheckWithRecords } from "../check-execution.test-support.ts";

describe("Project Gate native operation", () => {
  it("keeps native Check outcomes transcript-free", async () => {
    const logDirectory = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const scenarios = [
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-pass",
            displayName: "Fixture native pass",
            operation: () => ({ passed: true })
          }),
          expected: { status: "passed", data: { outcome: "completed" } }
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-diagnostic",
            displayName: "Fixture native diagnostic",
            operation: () => ({
              passed: false,
              code: "test-evidence-case.entity.case-missing",
              diagnostics: [
                {
                  data: { caseId: "AUX-EXAMPLE-001", kind: "case-entity-missing" },
                  id: "case:aux-example-001:entity-missing",
                  presentation: "AUX-EXAMPLE-001: required test entity is missing."
                },
                {
                  data: { caseId: "AUX-EXAMPLE-002", kind: "case-entity-missing" },
                  id: "case:aux-example-002:entity-missing",
                  presentation: "AUX-EXAMPLE-002: required test entity is missing."
                }
              ],
              focusedCommand: "bun run test-evidence -- check --root ."
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "test-evidence-case.entity.case-missing",
              diagnosticCount: 2
            },
            messages: [
              {
                level: "error",
                code: "test-evidence-case.entity.case-missing",
                message: "AUX-EXAMPLE-001: required test entity is missing."
              },
              {
                level: "error",
                code: "test-evidence-case.entity.case-missing",
                message: "AUX-EXAMPLE-002: required test entity is missing."
              },
              {
                level: "error",
                code: "test-evidence-case.entity.case-missing",
                message: "Run: bun run test-evidence -- check --root .."
              }
            ]
          },
          records: [
            {
              data: {
                caseId: "AUX-EXAMPLE-001",
                kind: "case-entity-missing"
              },
              identity: { id: "case:aux-example-001:entity-missing" }
            },
            {
              data: {
                caseId: "AUX-EXAMPLE-002",
                kind: "case-entity-missing"
              },
              identity: { id: "case:aux-example-002:entity-missing" }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-docs-diagnostic",
            displayName: "Fixture native docs diagnostic",
            operation: () => ({
              passed: false,
              code: "docs-example-validator-invalid",
              diagnostics: [
                {
                  data: {
                    kind: "machine-artifact-example-invalid",
                    path: "docs/examples/artifacts/mixed-outcomes/run.json"
                  },
                  id: "machine-artifact:syntax:docs%2Fexamples%2Fartifacts%2Fmixed-outcomes%2Frun.json",
                  presentation:
                    "docs/examples/artifacts/mixed-outcomes/run.json: current machine artifact example is invalid (syntax)."
                }
              ],
              focusedCommand: "bun run validate -- docs examples"
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "docs-example-validator-invalid",
              diagnosticCount: 1
            },
            messages: [
              {
                level: "error",
                code: "docs-example-validator-invalid",
                message:
                  "docs/examples/artifacts/mixed-outcomes/run.json: current machine artifact example is invalid (syntax)."
              },
              {
                level: "error",
                code: "docs-example-validator-invalid",
                message: "Run: bun run validate -- docs examples."
              }
            ]
          },
          records: [
            {
              data: {
                kind: "machine-artifact-example-invalid",
                path: "docs/examples/artifacts/mixed-outcomes/run.json"
              },
              identity: {
                id: "machine-artifact:syntax:docs%2Fexamples%2Fartifacts%2Fmixed-outcomes%2Frun.json"
              }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-decision-diagnostic",
            displayName: "Fixture native Decision diagnostic",
            operation: () => ({
              passed: false,
              code: "decision-records-invalid",
              diagnostics: [
                {
                  data: { decisionId: "decision-a.md", kind: "decision-invalid" },
                  id: "decision:decision-a.md:invalid",
                  presentation: "decision-a.md: Decision Record validation failed."
                },
                {
                  data: { decisionId: "decision-b.md", kind: "decision-invalid" },
                  id: "decision:decision-b.md:invalid",
                  presentation: "decision-b.md: Decision Record validation failed."
                },
                {
                  data: { decisionId: "decision-c.md", kind: "decision-invalid" },
                  id: "decision:decision-c.md:invalid",
                  presentation: "decision-c.md: Decision Record validation failed."
                }
              ],
              focusedCommand: "bun run decisions -- check"
            })
          }),
          expected: {
            status: "failed",
            data: {
              outcome: "failed",
              diagnosticCode: "decision-records-invalid",
              diagnosticCount: 3
            },
            messages: [
              {
                level: "error",
                code: "decision-records-invalid",
                message: "decision-a.md: Decision Record validation failed."
              },
              {
                level: "error",
                code: "decision-records-invalid",
                message: "decision-b.md: Decision Record validation failed."
              },
              {
                level: "error",
                code: "decision-records-invalid",
                message: "decision-c.md: Decision Record validation failed."
              },
              {
                level: "error",
                code: "decision-records-invalid",
                message: "Run: bun run decisions -- check."
              }
            ]
          },
          records: [
            {
              data: { decisionId: "decision-a.md", kind: "decision-invalid" },
              identity: { id: "decision:decision-a.md:invalid" }
            },
            {
              data: { decisionId: "decision-b.md", kind: "decision-invalid" },
              identity: { id: "decision:decision-b.md:invalid" }
            },
            {
              data: { decisionId: "decision-c.md", kind: "decision-invalid" },
              identity: { id: "decision:decision-c.md:invalid" }
            }
          ]
        },
        {
          check: createNativeOperationCheck({
            checkId: "fixture-native-throw",
            displayName: "Fixture native throw",
            operation: () => {
              throw new Error("fixture failure");
            }
          }),
          expected: {
            status: "unavailable",
            reason: { code: "native-operation-unavailable" }
          }
        }
      ];
      for (const scenario of scenarios) {
        const invocation = await invokeCheckWithRecords(scenario.check);
        assert.deepEqual(invocation.result, scenario.expected);
        assert.deepEqual(invocation.records, scenario.records ?? []);
        assert.equal(
          existsSync(join(logDirectory, "process", `${scenario.check.checkId}.log`)),
          false
        );
      }

      const longPresentation = `long presentation ${"x".repeat(300)}`;
      const boundedPreview = await invokeCheckWithRecords(
        createNativeOperationCheck({
          checkId: "fixture-native-bounded-preview",
          displayName: "Fixture native bounded preview",
          operation: () => ({
            passed: false,
            code: "native-preview-invalid",
            diagnostics: Array.from({ length: 12 }, (_, index) => ({
              data: { index: index + 1, kind: "fixture-diagnostic" },
              id: `fixture:diagnostic:${index + 1}`,
              presentation: index === 0 ? longPresentation : `fixture diagnostic ${index + 1}.`
            })),
            focusedCommand: "bun run fixture-native-preview"
          })
        })
      );
      assert.equal(boundedPreview.records.length, 12);
      assert.equal(boundedPreview.result.status, "failed");
      if (boundedPreview.result.status === "failed") {
        const messages = boundedPreview.result.messages ?? [];
        assert.equal(diagnosticCount(boundedPreview.result.data), 12);
        assert.equal(messages.length, 12);
        assert.equal(codePointLength(messages[0]?.message ?? ""), 240);
        assert.match(messages[0]?.message ?? "", /\[truncated\]$/);
        assert.equal(
          messages[10]?.message,
          "2 additional diagnostic(s) were omitted from terminal preview; inspect this Check's Records for the complete set."
        );
      }

      for (const operation of [
        () =>
          ({
            passed: false,
            code: "native-invalid-diagnostic",
            diagnostics: [],
            focusedCommand: "bun run fixture-native-invalid"
          }) as const,
        () =>
          ({
            passed: false,
            code: "native-duplicate-diagnostic",
            diagnostics: [
              { data: { index: 1 }, id: "fixture:duplicate", presentation: "first diagnostic." },
              { data: { index: 2 }, id: "fixture:duplicate", presentation: "second diagnostic." }
            ],
            focusedCommand: "bun run fixture-native-duplicate"
          }) as const,
        () =>
          ({
            passed: false,
            code: "native-unsafe-diagnostic",
            diagnostics: [
              { data: { index: 1 }, id: "fixture:unsafe", presentation: "unsafe\npresentation" }
            ],
            focusedCommand: "bun run fixture-native-unsafe"
          }) as const
      ]) {
        const invalid = await invokeCheck(
          createNativeOperationCheck({
            checkId: "fixture-native-invalid-diagnostics",
            displayName: "Fixture native invalid diagnostics",
            operation
          })
        );
        assert.deepEqual(invalid, {
          status: "unavailable",
          reason: { code: "native-operation-unavailable" }
        });
      }

      let passedAccessorReads = 0;
      const passedAccessorResult: NativeOperationResult = {
        passed: false,
        code: "native-accessor-invalid",
        diagnostics: [
          {
            data: { kind: "fixture-diagnostic" },
            id: "fixture:passed-accessor",
            presentation: "fixture diagnostic."
          }
        ],
        focusedCommand: "bun run fixture-native-accessor"
      };
      Object.defineProperty(passedAccessorResult, "passed", {
        enumerable: true,
        get: () => {
          passedAccessorReads += 1;
          return passedAccessorReads === 1 ? false : "unsafe\npresentation";
        }
      });
      const passedAccessor = await invokeCheckWithRecords(
        createNativeOperationCheck({
          checkId: "fixture-native-passed-accessor",
          displayName: "Fixture native passed accessor",
          operation: () => passedAccessorResult
        })
      );
      assert.deepEqual(passedAccessor.result, {
        status: "unavailable",
        reason: { code: "native-operation-unavailable" }
      });
      assert.deepEqual(passedAccessor.records, []);
      assert.equal(passedAccessorReads, 0);

      let diagnosticPresentationAccessorReads = 0;
      const diagnosticAccessorResult: NativeOperationResult = {
        passed: false,
        code: "native-accessor-invalid",
        diagnostics: [
          {
            data: { index: 1, kind: "fixture-diagnostic" },
            id: "fixture:before-accessor",
            presentation: "first diagnostic."
          },
          Object.defineProperty(
            {
              data: { index: 2, kind: "fixture-diagnostic" },
              id: "fixture:diagnostic-accessor",
              presentation: "second diagnostic."
            },
            "presentation",
            {
              enumerable: true,
              get: () => {
                diagnosticPresentationAccessorReads += 1;
                return diagnosticPresentationAccessorReads === 1
                  ? "second diagnostic."
                  : "unsafe\npresentation";
              }
            }
          )
        ],
        focusedCommand: "bun run fixture-native-accessor"
      };
      const diagnosticAccessor = await invokeCheckWithRecords(
        createNativeOperationCheck({
          checkId: "fixture-native-diagnostic-accessor",
          displayName: "Fixture native diagnostic accessor",
          operation: () => diagnosticAccessorResult
        })
      );
      assert.deepEqual(diagnosticAccessor.result, {
        status: "unavailable",
        reason: { code: "native-operation-unavailable" }
      });
      assert.deepEqual(diagnosticAccessor.records, []);
      assert.equal(diagnosticPresentationAccessorReads, 0);
      assert.doesNotMatch(JSON.stringify(diagnosticAccessor), /unsafe\\npresentation/);

      let focusedCommandAccessorReads = 0;
      const focusedCommandAccessorResult: NativeOperationResult = {
        passed: false,
        code: "native-accessor-invalid",
        diagnostics: [
          {
            data: { kind: "fixture-diagnostic" },
            id: "fixture:focused-command-accessor",
            presentation: "fixture diagnostic."
          }
        ],
        focusedCommand: "bun run fixture-native-accessor"
      };
      Object.defineProperty(focusedCommandAccessorResult, "focusedCommand", {
        enumerable: true,
        get: () => {
          focusedCommandAccessorReads += 1;
          return focusedCommandAccessorReads === 1
            ? "bun run fixture-native-accessor"
            : "unsafe\ncommand";
        }
      });
      const focusedCommandAccessor = await invokeCheckWithRecords(
        createNativeOperationCheck({
          checkId: "fixture-native-focused-command-accessor",
          displayName: "Fixture native focused command accessor",
          operation: () => focusedCommandAccessorResult
        })
      );
      assert.deepEqual(focusedCommandAccessor.result, {
        status: "unavailable",
        reason: { code: "native-operation-unavailable" }
      });
      assert.deepEqual(focusedCommandAccessor.records, []);
      assert.equal(focusedCommandAccessorReads, 0);

      const cancelled = new AbortController();
      cancelled.abort();
      const check = createNativeOperationCheck({
        checkId: "fixture-native-cancelled",
        displayName: "Fixture native cancelled",
        operation: () => {
          throw new Error("must not run");
        }
      });
      assert.deepEqual(await invokeCheck(check, cancelled.signal), {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(
        existsSync(join(logDirectory, "process", "fixture-native-cancelled.log")),
        false
      );

      const afterOperationCancellation = new AbortController();
      let operationWorkspaceRoot: string | undefined;
      let operationSignal: AbortSignal | undefined;
      const operationCancelled = createNativeOperationCheck({
        checkId: "fixture-native-operation-cancelled",
        displayName: "Fixture native operation cancellation",
        operation: (workspaceRoot, signal) => {
          operationWorkspaceRoot = workspaceRoot;
          operationSignal = signal;
          afterOperationCancellation.abort();
          return { passed: true };
        }
      });
      assert.deepEqual(await invokeCheck(operationCancelled, afterOperationCancellation.signal), {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(operationWorkspaceRoot, process.cwd());
      assert.equal(operationSignal, afterOperationCancellation.signal);
      assert.equal(
        existsSync(join(logDirectory, "process", "fixture-native-operation-cancelled.log")),
        false
      );
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
    }
  });
});

function diagnosticCount(data: object): number {
  if (!("diagnosticCount" in data) || typeof data.diagnosticCount !== "number") {
    throw new Error("Fixture native result is missing diagnosticCount");
  }
  return data.diagnosticCount;
}

function codePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}
