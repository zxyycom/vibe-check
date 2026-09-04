import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
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
});
