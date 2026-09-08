import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { validateDecisionRecordsForGate } from "../../../decision-records/command.ts";

import { createDecisionRecordsCheck } from "./decision-records.ts";
import { invokeCheck, invokeCheckWithRecords } from "./check-execution.test-support.ts";
import { createTestEvidenceCheck } from "./test-evidence/semantic-case-check.ts";

describe("Project Gate owner-safe native projections", () => {
  it("publishes only owner-approved Decision and Test Evidence diagnostics", async () => {
    const decisionRoot = mkdtempSync(join(process.cwd(), "vibe-check-decision-records-"));
    try {
      writeFileSync(join(decisionRoot, "unsafe-source.md"), "secret parser input\n", "utf8");
      const validation = await validateDecisionRecordsForGate({ decisionsDir: decisionRoot });
      assert.deepEqual(validation, {
        status: "failed",
        diagnostics: [
          {
            data: {
              decisionId: "unsafe-source.md",
              kind: "decision-source-invalid",
              path: "unsafe-source.md"
            },
            id: "source:unsafe-source.md:invalid",
            presentation: "unsafe-source.md: Decision Record source is invalid."
          }
        ]
      });

      const decision = await invokeCheckWithRecords(
        createDecisionRecordsCheck({ validateForGate: async () => validation })
      );
      assert.deepEqual(decision.records, [
        {
          data: {
            decisionId: "unsafe-source.md",
            kind: "decision-source-invalid",
            path: "unsafe-source.md"
          },
          identity: { id: "source:unsafe-source.md:invalid" }
        }
      ]);
      assert.equal(decision.result.status, "failed");
      assert.doesNotMatch(JSON.stringify(decision), /secret parser input/);

      const datedDecisionRoot = mkdtempSync(
        join(process.cwd(), "vibe-check-dated-decision-records-")
      );
      try {
        writeFileSync(
          join(datedDecisionRoot, "dated-decision.md"),
          `---
title: Dated decision fixture
id: 260908-dated-decision
status: active
alignment: aligned
createdAt: 2026-09-08T00:00:00Z
purpose: Prove dated diagnostic identity
background: A missing predecessor is intentional
decision: Keep safe diagnostic projection
tags:
  - testing
relations:
  - type: 修订
    target: 260908-missing-predecessor
---

## 目的
- Prove a dated ID.

## 背景
- The target is absent.

## 决策
- 采用: Project a safe relationship diagnostic.
`,
          "utf8"
        );
        assert.deepEqual(
          await validateDecisionRecordsForGate({ decisionsDir: datedDecisionRoot }),
          {
            diagnostics: [
              {
                data: {
                  decisionId: "260908-dated-decision",
                  kind: "decision-source-invalid",
                  path: "dated-decision.md"
                },
                id: "source:dated-decision.md:invalid",
                presentation: "dated-decision.md: Decision Record source is invalid."
              }
            ],
            status: "failed"
          }
        );
      } finally {
        rmSync(datedDecisionRoot, { force: true, recursive: true });
      }

      const privateText = "/private/workspace child stderr";
      const testEvidence = await invokeCheckWithRecords(
        createTestEvidenceCheck({
          check: async () => ({
            diagnostics: [
              {
                blocking: true,
                caseId: "AUX-EXAMPLE-001",
                code: "case.entity-unknown",
                column: 8,
                entityKey: privateText,
                line: 17,
                message: privateText,
                origin: "case",
                path: "docs/testing/cases/repository-tooling.md",
                selector: privateText,
                severity: "error",
                target: privateText
              }
            ],
            schemaVersion: 1,
            status: "error",
            summary: { bun: 0, cases: 0, entities: 0, mappedEntities: 0, topics: 0 }
          })
        })
      );
      assert.deepEqual(testEvidence.records, [
        {
          data: {
            caseId: "AUX-EXAMPLE-001",
            code: "case.entity-unknown",
            kind: "test-evidence-diagnostic",
            location: { column: 8, line: 17 },
            occurrence: 1,
            origin: "case",
            path: "docs/testing/cases/repository-tooling.md"
          },
          identity: {
            id: "test-evidence:case:case.entity-unknown:docs%2Ftesting%2Fcases%2Frepository-tooling.md:AUX-EXAMPLE-001::%3A17%3A8:1"
          }
        }
      ]);
      assert.equal(testEvidence.result.status, "failed");
      assert.doesNotMatch(JSON.stringify(testEvidence), /private\/workspace child stderr/);

      const unexpectedTopicHeading = await invokeCheckWithRecords(
        createTestEvidenceCheck({
          check: async () => ({
            diagnostics: [
              {
                blocking: true,
                code: "topic.heading-unexpected",
                column: 4,
                line: 23,
                message: privateText,
                origin: "case",
                path: "docs/testing/cases/repository-tooling.md",
                severity: "error"
              }
            ],
            schemaVersion: 1,
            status: "error",
            summary: { bun: 0, cases: 0, entities: 0, mappedEntities: 0, topics: 0 }
          })
        })
      );
      assert.deepEqual(unexpectedTopicHeading.records, [
        {
          data: {
            code: "topic.heading-unexpected",
            kind: "test-evidence-diagnostic",
            location: { column: 4, line: 23 },
            occurrence: 1,
            origin: "case",
            path: "docs/testing/cases/repository-tooling.md"
          },
          identity: {
            id: "test-evidence:case:topic.heading-unexpected:docs%2Ftesting%2Fcases%2Frepository-tooling.md:::%3A23%3A4:1"
          }
        }
      ]);
      assert.equal(unexpectedTopicHeading.result.status, "failed");
      assert.doesNotMatch(
        JSON.stringify(unexpectedTopicHeading),
        /private\/workspace child stderr/
      );

      const unavailable = await invokeCheck(
        createTestEvidenceCheck({
          check: async () => ({
            diagnostics: [
              {
                blocking: true,
                code: "new-unsafe-diagnostic",
                message: privateText,
                origin: "case",
                severity: "error"
              }
            ],
            schemaVersion: 1,
            status: "error",
            summary: { bun: 0, cases: 0, entities: 0, mappedEntities: 0, topics: 0 }
          })
        })
      );
      assert.deepEqual(unavailable, {
        status: "unavailable",
        reason: { code: "native-operation-unavailable" }
      });

      const unsafePath = await invokeCheck(
        createTestEvidenceCheck({
          check: async () => ({
            diagnostics: [
              {
                blocking: true,
                caseId: "AUX-EXAMPLE-001",
                code: "case.entity-unknown",
                line: 1,
                message: privateText,
                origin: "case",
                path: "/private/workspace",
                severity: "error"
              }
            ],
            schemaVersion: 1,
            status: "error",
            summary: { bun: 0, cases: 0, entities: 0, mappedEntities: 0, topics: 0 }
          })
        })
      );
      assert.deepEqual(unsafePath, {
        status: "unavailable",
        reason: { code: "native-operation-unavailable" }
      });
    } finally {
      rmSync(decisionRoot, { force: true, recursive: true });
    }
  });
});
