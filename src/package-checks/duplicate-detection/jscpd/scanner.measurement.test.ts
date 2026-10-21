import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { DEFAULT_JSCPD_COMMAND } from "./command-resolution.ts";
import { scanWithJscpd } from "./scanner.ts";

describe("quality jscpd real language measurements", () => {
  it("keeps Markdown literal tokens and Vue template ranges within exact inputs", () => {
    const samples = [
      {
        extension: "md",
        source: [
          "# Example",
          "",
          "Visit https://example.test/path and retain /* literal Markdown text.",
          "This is a repeated prose sentence with enough tokens for comparison.",
          "The next line belongs to the same repeated prose block.",
          "Another repeated line ends the block correctly.",
          ""
        ].join("\n"),
        startLine: 1,
        endLine: 6,
        tokenCount: 51
      },
      {
        extension: "vue",
        source: [
          "<template>",
          '  <div class="wrapper">',
          '    <span v-for="item in items" :key="item.id">{{ item.name }}</span>',
          '    <button @click="submit">Submit now</button>',
          "  </div>",
          "</template>",
          "<script setup>",
          'const items = [{ id: 1, name: "alpha" }];',
          "function submit() { console.log(items); }",
          "</script>",
          ""
        ].join("\n"),
        startLine: 2,
        endLine: 5,
        tokenCount: 46
      }
    ];
    for (const sample of samples) {
      const root = mkdtempSync(join(tmpdir(), "vibe-check-jscpd-ranges-"));
      try {
        for (const name of ["a", "b", "unapproved"]) {
          writeFileSync(join(root, `${name}.${sample.extension}`), sample.source, "utf8");
        }
        const paths = [`a.${sample.extension}`, `b.${sample.extension}`];
        const result = scanWithJscpd({
          cwd: root,
          files: paths,
          dependency: { command: DEFAULT_JSCPD_COMMAND },
          minimumLines: 3,
          minimumTokens: 20
        });
        assert.equal(result.ok, true);
        if (!result.ok) continue;
        assert.equal(result.measurements.length, 1);
        assert.deepEqual(result.measurements[0], {
          sourcePaths: paths,
          payload: {
            id: 1,
            codeAreas: [],
            lineCount: sample.endLine - sample.startLine + 1,
            tokenCount: sample.tokenCount,
            locations: paths.map((path) => ({
              path,
              startLine: sample.startLine,
              endLine: sample.endLine
            }))
          }
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });
});
