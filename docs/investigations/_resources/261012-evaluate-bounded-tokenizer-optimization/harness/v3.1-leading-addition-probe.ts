import type { TokenMatch } from "../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
type SharedSnapshot =
  typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts");
import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const w = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const load = (v: string): Promise<SharedSnapshot> =>
  import(`${w}/${v}/src/package-checks/function-metrics/analyzer/shared/code-reader.ts`);
const modules = {
  baseline: await load("baseline"),
  v3: await load("candidate-v3"),
  v31: await load("candidate-v3.1")
};
const rows = [];
for (const source of ["/**", "/*/", "/* /* ", "/* closed */ \t\r\n/**", "x", ""])
  for (const addition of [
    "?",
    "*",
    "+",
    "{0}",
    "(?i)?",
    "",
    "|(?=.)",
    "|(a)",
    "(?:x)",
    " ",
    "|("
  ]) {
    const outcome = (module: SharedSnapshot) => {
      const raw: { text: string; offset: number }[] = [];
      try {
        const tokens = [
          ...module.CodeReader.generateTokens(source, addition, (m: TokenMatch) => {
            raw.push({ text: m.text, offset: m.startOffset });
            return m.text;
          })
        ];
        return { kind: "complete", raw, tokens };
      } catch (e: unknown) {
        if (!(e instanceof Error)) throw e;
        return { kind: "error", name: e.name };
      }
    };
    const baseline = outcome(modules.baseline),
      v3 = outcome(modules.v3),
      v31 = outcome(modules.v31);
    assert.deepEqual(v31, baseline);
    rows.push({
      source,
      addition,
      baseline,
      v3,
      v31,
      v3Equal: JSON.stringify(v3) === JSON.stringify(baseline)
    });
  }
writeFileSync(
  w + `/v3.1-leading-addition-${process.versions.bun ? "bun" : "node"}.json`,
  JSON.stringify(
    {
      runtime: process.versions,
      rows,
      v31Result: "equal",
      v3Counterexamples: rows.filter((r) => !r.v3Equal).length
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify({
    rows: rows.length,
    v31: "equal",
    v3Counterexamples: rows.filter((r) => !r.v3Equal).length
  })
);
