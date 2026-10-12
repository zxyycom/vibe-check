/** Independent A04 correctness probe through the complete analyzer facade, not only tokenizer.
 * Bounded successful-match width counts are not timings; no production/test/Case edits or output I/O. */
import assert from "node:assert/strict";
import { analyzeLizardSource } from "../../../../src/package-checks/function-metrics/analyzer/port-facade.ts";

const originalExec = RegExp.prototype.exec;
const samples: object[] = [];
for (const interpolationCount of [16, 32, 64, 128]) {
  let quotedMatches = 0;
  let quotedMatchedCharacters = 0;
  RegExp.prototype.exec = function (source: string) {
    const matched = originalExec.call(this, source);
    if (this.global && this.source.includes("0x") &&
      matched?.[0].startsWith('"') && matched[0].includes("#{")) {
      quotedMatches += 1;
      quotedMatchedCharacters += matched[0].length;
    }
    return matched;
  };
  try {
    const sourceCode = `x = "${"#{1}".repeat(interpolationCount)}"`;
    const result = analyzeLizardSource({ filename: "audit.rb", sourceCode });
    assert.notEqual(result, undefined);
    assert.equal(result!.function_list.length, 0);
    assert.equal(quotedMatches, interpolationCount);
    assert.equal(quotedMatchedCharacters, 2 * interpolationCount ** 2 + 4 * interpolationCount);
    samples.push({ interpolationCount, bytes: Buffer.byteLength(sourceCode),
      quotedMatches, quotedMatchedCharacters, functionCount: result!.function_list.length });
  } finally {
    RegExp.prototype.exec = originalExec;
  }
}
console.log(JSON.stringify({
  baseline: "21777db37c0284308b8c69eb2cc92ab0b012cd9b",
  runtime: { node: process.versions.node },
  command: "timeout --signal=KILL 20s mise exec bun@1.3.14 node@24.18.0 -- node docs/investigations/_resources/261012-audit-checks-core-algorithmic-complexity/review-ruby-probe.ts",
  method: "Complete analyzeLizardSource facade; successful quoted tokenizer match-width counts, not regex engine steps or elapsed time",
  samples
}, null, 2));
