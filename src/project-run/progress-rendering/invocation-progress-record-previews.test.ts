import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "../invocation/run.ts";
import { capturedProgressWriter, check, definition } from "./invocation.test-support.ts";

describe("Package Run progress rendering outputs", () => {
  it("renders accepted attention Records while retaining complete Records and messages in final facts", async () => {
    const output = capturedProgressWriter();
    const messages = Array.from({ length: 6 }, (_, index) => ({
      level: "error" as const,
      code: `message-${index + 1}`,
      message: `message ${index + 1} ${"x".repeat(260)}`
    }));
    const result = await executeValidatedRun(
      definition(
        [
          check({
            checkId: "attention-records",
            visibility: "attention",
            execution: ({ records }) => {
              for (let index = 1; index <= 6; index += 1) {
                records.report({ id: `record-${index}` }, { index, text: "x".repeat(260) });
              }
              return { status: "passed", data: {}, messages };
            }
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(result.snapshot.records.length, 6);
    assert.deepEqual(
      result.checkMessages,
      messages.map((message) => ({
        checkId: "attention-records",
        ...message
      }))
    );
    const transcript = output.writes.join("");
    assert.equal(transcript.match(/^ {4}\[record\]/gmu)?.length, 5);
    assert.equal(transcript.match(/^ {4}\[error\]/gmu)?.length, 5);
    assert.equal(
      transcript.includes(
        "    [records] 1 additional record(s) were omitted from terminal preview.\n"
      ),
      true
    );
    assert.equal(
      transcript.includes(
        "    [messages] 1 additional message(s) were omitted from terminal preview.\n"
      ),
      true
    );
    assert.equal(transcript.includes("… [truncated]"), true);
    assert.equal(transcript.includes("  [1/1] attention-records | passed |"), true);
  });

  it("applies RunControls preview limits and formatter to terminal and tee bytes without changing facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-preview-"));
    try {
      const output = capturedProgressWriter();
      let definitionFormatterCalls = 0;
      const formatterContexts: Array<Readonly<{ kind: "record" | "message"; text: string }>> = [];
      const source = definition(
        [
          check({
            checkId: "configured-preview",
            execution: ({ records }) => {
              records.report({ id: "one" }, { order: 1 });
              records.report({ id: "two" }, { order: 2 });
              return {
                status: "passed",
                data: {},
                messages: [
                  { level: "info", code: "one", message: "first message" },
                  { level: "info", code: "two", message: "second message" }
                ]
              };
            }
          })
        ],
        true
      );
      const configured = {
        ...source,
        outputs: {
          ...source.outputs,
          progressRendering: {
            ...source.outputs.progressRendering,
            formatter: () => {
              definitionFormatterCalls += 1;
              return "definition formatter";
            },
            messagePreviewLimit: 2,
            recordPreviewLimit: 2,
            textPreviewCodePointLimit: 30
          }
        }
      };
      const fingerprint = createDeclarativeFingerprint(
        normalizeProjectDefinition(configured).declarative
      );
      const result = await executeValidatedRun(
        configured,
        {
          progressLogFile: "progress.log",
          projectRoot: root,
          outputs: {
            progressRendering: {
              formatter: (context) => {
                formatterContexts.push({ kind: context.kind, text: context.text });
                return "custom\nmessage";
              },
              messagePreviewLimit: 1,
              recordPreviewLimit: 0
            }
          }
        },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.declarativeFingerprint, fingerprint);
      assert.equal(definitionFormatterCalls, 0);
      assert.deepEqual(formatterContexts, [{ kind: "message", text: "first message" }]);
      assert.equal(result.snapshot.records.length, 2);
      assert.equal(result.checkMessages.length, 2);
      const transcript = output.writes.join("");
      assert.equal(transcript.includes("    [record]"), false);
      assert.equal(transcript.includes("    [records] 2 additional record(s) were omitted"), true);
      assert.equal(transcript.includes("    [info] custom\\nmessage\n"), true);
      assert.equal(
        transcript.includes("    [messages] 1 additional message(s) were omitted"),
        true
      );
      assert.equal(readFileSync(join(root, "progress.log"), "utf8"), transcript);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
