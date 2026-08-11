import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { runJscpdScan } from "./jscpd.ts";
import { runLizardScan } from "./lizard.ts";
import { runSccScan } from "./scc.ts";
import {
  createJscpdTestContext,
  createLizardTestContext,
  createSccTestContext,
  withMutedConsoleLog
} from "./current-revision-test-support.ts";

describe("current scanner exact-result scope", () => {
  it("rejects measurements that reference paths outside approved exact inputs", async () => {
    const sccFixture = createSccTestContext(
      "vibe-check-current-scc-scope-",
      [
        'process.stdout.write("Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\n");',
        'process.stdout.write("TypeScript,../outside.ts,outside.ts,10,8,1,1,2,100,8\\n");'
      ].join("\n")
    );
    const lizardFixture = createLizardTestContext(
      "vibe-check-current-lizard-scope-",
      'process.stdout.write("8,2,10,0,8,outside@1-8@../outside.ts,../outside.ts,outside,outside(),1,8\\n");\n'
    );
    const jscpdFixture = createJscpdTestContext(
      "vibe-check-current-jscpd-scope-",
      outOfScopeJscpdSource()
    );

    try {
      const capabilityResults = await withMutedConsoleLog(async () => [
        { capability: "scc", result: runSccScan(sccFixture.context, ["scripts/a.ts"]) },
        { capability: "lizard", result: runLizardScan(lizardFixture.context, ["scripts/a.ts"]) },
        {
          capability: "jscpd",
          result: await runJscpdScan(jscpdFixture.context, new Map([
            ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
          ]))
        }
      ]);

      for (const { capability, result } of capabilityResults) {
        assert.equal(result.status, "failed", capability);
        if (result.status === "failed") {
          assert.equal(result.diagnostic.kind, "invalid-result", capability);
          assert.match(result.diagnostic.message, /unapproved input path/, capability);
        }
      }
      assert.deepEqual(sccFixture.context.metrics.fileMetrics, []);
      assert.deepEqual(lizardFixture.context.metrics.functionMetrics, []);
      assert.deepEqual(jscpdFixture.context.metrics.duplicateCode, []);
    } finally {
      for (const fixture of [sccFixture, lizardFixture, jscpdFixture]) {
        rmSync(fixture.tempDir, { recursive: true, force: true });
      }
    }
  });
});

function outOfScopeJscpdSource(): string {
  return `
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const outputDir = process.argv[process.argv.indexOf("--output") + 1];
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "jscpd-report.json"), JSON.stringify({
  duplicates: [{
    lines: 3,
    tokens: 12,
    firstFile: { name: "../outside.ts", start: 1, end: 3 },
    secondFile: { name: "scripts/b.ts", start: 1, end: 3 }
  }]
}));
`;
}
