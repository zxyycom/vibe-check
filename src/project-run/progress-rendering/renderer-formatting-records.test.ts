import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoreRecord } from "../../check-settlement/facts.ts";
import { createProgressRenderer } from "./renderer.ts";
import { createWriter, settled } from "./renderer.test-support.ts";

const PREVIEW_TEXT_LIMIT = 240;

function record(id: string, data: CoreRecord["data"]): CoreRecord {
  return Object.freeze({ checkId: "records", id, data });
}

function previewText(line: string): string {
  const start = line.indexOf("] ") + 2;
  return line.slice(start);
}

function codePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

describe("Package Run progress Record and message previews", () => {
  it("renders independent bounded Record and message previews without changing their source facts", () => {
    const output = createWriter();
    const renderer = createProgressRenderer(output.writer);
    const records = [
      record("record\nid", { a: "first", text: "x".repeat(300), z: 1 }),
      ...Array.from({ length: 5 }, (_, index) =>
        record(`record-${index + 2}`, { index: index + 2 })
      )
    ];
    const messages = [
      { level: "error" as const, code: "long", message: `message\n${"🙂".repeat(300)}` },
      ...Array.from({ length: 5 }, (_, index) => ({
        level: "info" as const,
        code: `message-${index + 2}`,
        message: `message ${index + 2}`
      }))
    ];

    renderer.render({ kind: "prepared", totalChecks: 1 });
    renderer.render(
      settled("records", "Records", { status: "passed", data: {} }, 1, {
        messages,
        records,
        visibility: "attention"
      })
    );

    const block = output.writes[1] ?? "";
    const lines = block.trimEnd().split("\n");
    const recordLines = lines.filter((line) => line.startsWith("    [record]"));
    const messageLines = lines.filter(
      (line) => line.startsWith("    [error]") || line.startsWith("    [info]")
    );
    assert.equal(lines[0], "  [1/1] Records | passed | 1ms");
    assert.equal(recordLines.length, 5);
    assert.equal(messageLines.length, 5);
    assert.equal(
      recordLines[0]?.startsWith('    [record] record\\nid | {"a":"first","text":"'),
      true
    );
    assert.equal(messageLines[0]?.includes("message\\n"), true);
    assert.equal(codePointLength(previewText(recordLines[0] ?? "")), PREVIEW_TEXT_LIMIT);
    assert.equal(codePointLength(previewText(messageLines[0] ?? "")), PREVIEW_TEXT_LIMIT);
    assert.equal(recordLines[0]?.endsWith("… [truncated]"), true);
    assert.equal(messageLines[0]?.endsWith("… [truncated]"), true);
    assert.equal(
      block.includes("    [records] 1 additional record(s) were omitted from terminal preview.\n"),
      true
    );
    assert.equal(
      block.includes(
        "    [messages] 1 additional message(s) were omitted from terminal preview.\n"
      ),
      true
    );
    assert.equal(records.length, 6);
    assert.equal(messages.length, 6);
    assert.equal(records[0]?.data.a, "first");
    assert.equal(messages[0]?.message.endsWith("🙂"), true);

    const formattedOutput = createWriter();
    const formatterContexts: Array<{
      readonly kind: "record" | "message";
      readonly maxCodePoints: number;
      readonly text: string;
    }> = [];
    const formattedRenderer = createProgressRenderer(formattedOutput.writer, undefined, {
      enabled: true,
      formatter: (context) => {
        formatterContexts.push(context);
        assert.equal(Object.isFrozen(context), true);
        return context.kind === "record" ? "🙂record" : "";
      },
      messagePreviewLimit: 1,
      recordPreviewLimit: 1,
      textPreviewCodePointLimit: 1
    });
    formattedRenderer.render({ kind: "prepared", totalChecks: 1 });
    formattedRenderer.render(
      settled("formatted", "Formatted", { status: "passed", data: {} }, 1, {
        messages: messages.slice(0, 2),
        records: records.slice(0, 2),
        visibility: "attention"
      })
    );
    const formattedBlock = formattedOutput.writes[1] ?? "";
    assert.deepEqual(formatterContexts, [
      {
        kind: "record",
        maxCodePoints: 1,
        text: `record\nid | ${JSON.stringify(records[0]?.data)}`
      },
      { kind: "message", maxCodePoints: 1, text: messages[0]?.message ?? "" }
    ]);
    assert.equal(formattedBlock.includes("    [record] …\n"), true);
    assert.equal(formattedBlock.includes("    [error] \n"), true);
    assert.equal(
      formattedBlock.includes(
        "    [records] 1 additional record(s) were omitted from terminal preview.\n"
      ),
      true
    );
    assert.equal(
      formattedBlock.includes(
        "    [messages] 1 additional message(s) were omitted from terminal preview.\n"
      ),
      true
    );
  });
});
