import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

/** A child contains the built-in mock so other cache tests retain their real filesystem bindings. */
export function assertPendingAppendCancellation(directory: string): void {
  const result = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import assert from "node:assert/strict";
import * as filesystem from "node:fs/promises";
import { join } from "node:path";
import { mock } from "bun:test";

const appendStarted = Promise.withResolvers();
const releaseAppend = Promise.withResolvers();
const appendFile = filesystem.appendFile;
let appendCalls = 0;
mock.module("node:fs/promises", () => ({
  ...filesystem,
  async appendFile(...args) {
    appendCalls += 1;
    appendStarted.resolve();
    await releaseAppend.promise;
    return appendFile(...args);
  }
}));
const { MarkdownLinkParseFactsSession } = await import(${JSON.stringify(new URL("./session.ts", import.meta.url).href)});
const controller = new AbortController();
const session = new MarkdownLinkParseFactsSession({ enabled: true, directory: ${JSON.stringify(directory)} });
const parsed = await session.parse(new TextEncoder().encode("# Current\\n"), controller.signal);
assert.equal(parsed?.ok, true);
let finalized = false;
const publication = session.finalize(controller.signal);
const completion = publication.then(() => { finalized = true; });
await appendStarted.promise;
try {
  controller.abort();
  await new Promise(setImmediate);
  assert.equal(finalized, false, "finalize must remain pending while the entered append is blocked");
  assert.strictEqual(session.finalize(new AbortController().signal), publication);
} finally {
  releaseAppend.resolve();
}
await completion;
assert.equal(finalized, true);
assert.equal(appendCalls, 1);
const lines = (await filesystem.readFile(join(${JSON.stringify(directory)}, "markdown-link-parse-facts-v1.jsonl"), "utf8")).trimEnd().split("\\n");
assert.equal(lines.length, 1);
assert.doesNotThrow(() => JSON.parse(lines[0]));
`
    ],
    { encoding: "utf8", timeout: 10_000 }
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
