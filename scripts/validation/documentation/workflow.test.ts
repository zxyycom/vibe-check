import assert from "node:assert/strict";
import test from "node:test";

import { validateDocs } from "./workflow.ts";

test("docs validation library reports success only through an explicit reporter", async () => {
  const directConsoleMessages: string[] = [];
  const reportedMessages: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]): void => {
    directConsoleMessages.push(values.map(String).join(" "));
  };
  try {
    await validateDocs({ tasks: ["examples"] });
    await validateDocs({
      tasks: ["examples"],
      report: (message) => reportedMessages.push(message)
    });
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(directConsoleMessages, []);
  assert.match(reportedMessages.join("\n"), /current machine artifact examples ok: 1 set\(s\)/);
  assert.match(reportedMessages.join("\n"), /report examples ok:/);
});
