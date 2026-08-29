import assert from "node:assert/strict";
import { it } from "node:test";

import { runScan } from "./scan.ts";

it("reports the enabled Product diagnostic log file without starting a Run", async () => {
  const lines: string[] = [];

  const status = await runScan({
    run: async () => ({
      kind: "cancelled",
      outputs: { diagnosticLogging: { file: ".log/project-run/run-fixture.log" } }
    }),
    writeLine: (line): void => {
      lines.push(line);
    }
  });

  assert.equal(status, 2);
  assert.deepEqual(lines, ["repository quality diagnostic log: .log/project-run/run-fixture.log"]);
});
