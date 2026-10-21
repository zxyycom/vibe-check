# markdownlint 0.42.0 initial graph incompatibility

Observed 2026-10-21 UTC, before graph alignment. This is implementation evidence for the current Change, not a rewrite of the pre-upgrade investigation.

## Failure and root cause

All three existing MD052 tests failed with zero reference findings rather than the expected full/collapsed/image observations. Frozen catalog output lost only the MD052 finding (`detection-after-initial.json`).

The installed `markdownlint/lib/micromark-parse.mjs` states that `micromark-core-commonmark` must exactly match the instance used by micromark. It imports `labelEnd`, replaces its `tokenize` function while parsing, and thereby synthesizes the undefined-reference tokens consumed by MD052. The initial lock retained separate core instances:

| Consumer | Resolved module |
| --- | --- |
| markdownlint 0.42.0 | `node_modules/.pnpm/micromark-core-commonmark@2.0.4/node_modules/micromark-core-commonmark/index.js` |
| markdownlint's micromark 4.0.3 | `node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/index.js` |

Those are the actual `createRequire(...).resolve(...)` results, not just semver declarations. The initial lock snapshot likewise records `markdownlint@0.42.0 → core 2.0.4` but `micromark@4.0.3 → core 2.0.3`.

A direct Node 24.18.0 control, outside the Product adapter, also returned `{"x.md":[]}`:

```js
import { lint } from "markdownlint/promise";
await lint({
  config: { default: false, MD001: true, MD052: true },
  strings: { "x.md": "[full][missing-full]\n[collapsed][]\n![image][missing-image]\n" }
});
```

Product tests under pinned Bun 1.3.14 and the frozen adapter corpus under ambient Bun 1.4.2 reproduce the same missing references. This rules out a Bun-only regression and explains why adding another parser warm-up rule cannot repair the graph: parsing already runs, but the shim mutates the wrong module instance.

## Initial graph-fix boundary

Root authorized the dependency writer to align only the affected transitive graph to core 2.0.4. Do not copy the parser, weaken MD052 expectations, add public rule options, or change scanner policy. The existing single-rule and all-rule adapter/Check tests are direct regression evidence; an additional test coupled to private upstream module filenames is unnecessary.

At this initial phase no adapter change was proposed solely to hide an installation error. The initial broken graph was never a release baseline. The later consumer-lock review established that a repository override alone is insufficient; the final Product capability boundary below supersedes that initial choice.

## Final consumer and cache boundary

After scoped graph alignment, actual module resolution reports both consumers using core 2.0.4. The same Node24 public API control returns exactly three MD052 findings with ranges `[1,20]`, `[1,13]`, `[1,23]`; pinned Bun adapter/Check evidence agrees.

A consumer may nevertheless retain a legal old transitive lock. Product now checks the selected undefined-reference capability through a fixed public API probe, once per process, before fresh lint or cache lookup. A missing capability is `backend-failed`, not zero findings; non-reference rules do not trigger or inherit that failure. Cache contract v2 invalidates older same-backend v1 results as well as the pre-upgrade cache. The isolated child regression injects the observed public empty-array response and proves that even a previously trusted warm v2 cache cannot bypass this current capability check. See `detection-lint.md` and the owner documents for the implemented boundary.
