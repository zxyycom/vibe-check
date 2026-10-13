import type { TokenMatch } from "../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
type SharedSnapshot =
  typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts");
import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const w = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const load = (name: string): Promise<SharedSnapshot> =>
  import(`${w}/${name}/src/package-checks/function-metrics/analyzer/shared/code-reader.ts`);
const before = await load("baseline"),
  after = await load("candidate-v3");
const rows = [];
for (const source of [
  "/* closed */ \t\r\n/* /* ",
  "`closed` \t\u001c `${x}${x}",
  "a\u{1f600}\ud800\n",
  "#x\n/*/",
  ""
])
  for (const addition of ["", "|(?=.)", "|(a)", "|(?i)(?=x)"])
    for (const action of ["drain", "return-after-1", "throw-at-1", "throw-at-3"]) {
      const capture = (module: SharedSnapshot) => {
        const events: unknown[] = [];
        let calls = 0;
        const iterator = module.CodeReader.generateTokens(source, addition, (m: TokenMatch) => {
          events.push(["factory", m.text, m.startOffset, m.group(0), m.group(1)]);
          if (action === `throw-at-${++calls}`) throw Error("factory-stop");
          return m.text;
        });
        events.push(["created", calls]);
        try {
          let i = 0;
          for (const t of iterator) {
            events.push(["yield", t]);
            if (action === "return-after-1" && ++i === 1) break;
          }
        } catch (e: unknown) {
          if (!(e instanceof Error)) throw e;
          events.push(["error", e.message]);
        }
        events.push(["finished", calls]);
        return events;
      };
      const a = capture(before),
        b = capture(after);
      assert.deepEqual(b, a);
      rows.push({ source, addition, action, events: a });
    }
for (const addition of ["|(", "|["]) {
  const capture = (module: SharedSnapshot) => {
    let calls = 0;
    let iterator: Generator<string>;
    const events: unknown[] = [];
    try {
      iterator = module.CodeReader.generateTokens("x", addition, () => {
        calls++;
        return "x";
      });
      events.push("created");
      iterator.next();
      events.push("next-ok");
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw e;
      events.push(e.name);
    }
    events.push(calls);
    return events;
  };
  assert.deepEqual(capture(after), capture(before));
  rows.push({ addition, action: "invalid-addition-lazy-error", events: capture(before) });
}
writeFileSync(
  w + `/v3-lifecycle-${process.versions.bun ? "bun" : "node"}.json`,
  JSON.stringify({ runtime: process.versions, rows, result: "equal" }, null, 2) + "\n"
);
console.log(JSON.stringify({ lifecycleRows: rows.length, result: "equal" }));
