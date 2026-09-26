import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { markdownLint } from "./default-check.ts";
import { executeMarkdownLint } from "./execution.ts";
import { executeMarkdownLintCheck, MARKDOWN_LINT_OPTIONS } from "./markdown-lint.test-support.ts";
import { MARKDOWN_LINT_RULE_NAMES } from "./options.ts";

const IDENTITY = {
  path: "docs/source.md",
  rule: "no-missing-space-atx",
  range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
} as const;

describe("Markdown lint waiver authoring", () => {
  it("snapshots closed full-range identities and keeps resolved waivers deeply frozen", () => {
    const identity = {
      ...IDENTITY,
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
    };
    const authored = { identity, reason: "Reviewed legacy heading." };
    const findingWaivers = [authored];
    const check = markdownLint({ findingWaivers });
    identity.range.start.column = 2;
    identity.range.end.column = 4;
    authored.reason = "Changed after construction.";
    findingWaivers.length = 0;
    assert.deepEqual(check.options.findingWaivers, [
      { identity: IDENTITY, reason: "Reviewed legacy heading." }
    ]);
    const resolved = check.options.findingWaivers[0];
    assert.ok(resolved !== undefined);
    for (const frozen of [
      check.options.findingWaivers,
      resolved,
      resolved.identity,
      resolved.identity.range,
      resolved.identity.range.start,
      resolved.identity.range.end
    ])
      assert.equal(Object.isFrozen(frozen), true);
    assert.notEqual(resolved.identity, identity);
    assert.notEqual(resolved.identity.range.start, identity.range.start);
    for (const rule of MARKDOWN_LINT_RULE_NAMES) {
      assert.doesNotThrow(() =>
        markdownLint({
          findingWaivers: [
            {
              identity: {
                path: "docs/point.markdown",
                rule,
                range: {
                  start: { line: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER },
                  end: { line: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER }
                }
              },
              reason: "A point range remains a valid identity."
            }
          ]
        })
      );
    }
  });

  it("rejects malformed ranges, noncanonical paths, duplicate identities and hostile authoring", async () => {
    const waiver = { identity: IDENTITY, reason: "Reviewed." };
    let getterReads = 0;
    const accessor = (key: string) =>
      Object.defineProperty({}, key, {
        enumerable: true,
        get() {
          getterReads += 1;
          return undefined;
        }
      });
    const invalidIdentities: readonly unknown[] = [
      null,
      { ...IDENTITY, extra: true },
      { path: IDENTITY.path, rule: IDENTITY.rule },
      { ...IDENTITY, rule: "MD018" },
      { ...IDENTITY, range: { ...IDENTITY.range, extra: true } },
      { ...IDENTITY, range: { start: IDENTITY.range.start } },
      {
        ...IDENTITY,
        range: { start: { ...IDENTITY.range.start, extra: true }, end: IDENTITY.range.end }
      },
      {
        ...IDENTITY,
        range: { start: IDENTITY.range.start, end: { ...IDENTITY.range.end, extra: true } }
      },
      { ...IDENTITY, range: { start: { line: 1, column: 4 }, end: { line: 1, column: 3 } } },
      { ...IDENTITY, range: { start: IDENTITY.range.start, end: { line: 2, column: 3 } } },
      accessor("range"),
      { ...IDENTITY, range: accessor("start") },
      { ...IDENTITY, range: { start: accessor("column"), end: IDENTITY.range.end } },
      { ...IDENTITY, range: { start: IDENTITY.range.start, end: accessor("line") } },
      Object.assign(Object.create({ inherited: true }), IDENTITY),
      Object.defineProperty({ ...IDENTITY }, "hidden", { value: true }),
      { ...IDENTITY, [Symbol("extra")]: true },
      new Proxy(
        {},
        {
          ownKeys() {
            throw new Error("hostile identity");
          }
        }
      )
    ];
    const invalidPaths = [
      "",
      "../source.md",
      "./source.md",
      "/source.md",
      "docs//source.md",
      "docs/../source.md",
      "docs/",
      "C:source.md",
      "docs\\source.md",
      "docs/\u0000source.md"
    ];
    const invalidPositions = [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "1"];
    const invalidWaivers: readonly unknown[] = [
      null,
      {},
      new Array(1),
      Object.assign([waiver], { extra: true }),
      [accessor("reason")],
      [accessor("identity")],
      [Object.defineProperty({ ...waiver }, "hidden", { value: true })],
      [{ ...waiver, extra: true }],
      [{ ...waiver, reason: "" }],
      [{ ...waiver, reason: 1 }],
      [{ identity: IDENTITY }],
      [
        waiver,
        {
          reason: "Duplicate with reordered keys.",
          identity: { range: IDENTITY.range, rule: IDENTITY.rule, path: IDENTITY.path }
        }
      ],
      ...invalidIdentities.map((identity) => [{ ...waiver, identity }]),
      ...invalidPaths.map((path) => [{ ...waiver, identity: { ...IDENTITY, path } }]),
      ...invalidPositions.flatMap((value) =>
        ["start", "end"].flatMap((side) =>
          ["line", "column"].map((coordinate) => [
            {
              ...waiver,
              identity: {
                ...IDENTITY,
                range: { ...IDENTITY.range, [side]: { line: 1, column: 1, [coordinate]: value } }
              }
            }
          ])
        )
      )
    ];
    for (const findingWaivers of invalidWaivers) {
      assert.throws(
        () => Reflect.apply(markdownLint, undefined, [{ findingWaivers }]),
        /documented closed policy/
      );
    }
    assert.throws(
      () => Reflect.apply(markdownLint, undefined, [accessor("findingWaivers")]),
      /documented closed policy/
    );
    const hostileResolvedWaiver = Object.defineProperty({ ...waiver }, "identity", {
      enumerable: true,
      get() {
        getterReads += 1;
        return IDENTITY;
      }
    });
    const malformedResolved = { ...MARKDOWN_LINT_OPTIONS, findingWaivers: [hostileResolvedWaiver] };
    const observed = await executeMarkdownLintCheck(
      executeMarkdownLint,
      malformedResolved,
      "/not-read-for-invalid-options"
    );
    assert.equal(observed.result.status, "unavailable");
    assert.deepEqual(observed.result.reason, { code: "invalid-options" });
    assert.deepEqual(observed.records, []);
    assert.equal(getterReads, 0);
  });
});
