# jscpd 5.1.1 differential and clone-baseline evaluation

This Change records implementation evidence only. It does not add a Product baseline input, change
duplicate finding settlement, or authorize `--baseline`, `--baseline-from-ref`, or
`--fail-on-new-clones` in production.

## Authority, evidence, and reproducibility boundary

- This artifact owns the 2026-09-01 differential and baseline-experiment observations for this
  Change. Current Product behavior and consumer-facing boundaries remain owned by
  [`duplicateDetection`](../../docs/checks/duplicate-detection.md) and
  [Check-owned scanner dependencies](../../docs/scanner-dependencies.md); the active provenance
  direction remains owned by the
  [jscpd-version Decision](../../docs/decisions/treat-jscpd-version-as-adapter-provenance.md).
- The isolated differential was run on Linux x64/glibc under
  `/tmp/vibe-check-jscpd-diff-qZNQdt`. Each exact version was installed into its own temporary pnpm
  project and invoked through that package's declared `./run-jscpd.js` bin with Node hosting the
  wrapper.
- The baseline experiment was run on the same host under
  `/tmp/vibe-check-jscpd-baseline-7LEbar` with jscpd `5.1.1`. Its checked-in-style `baseline.json`
  had SHA-256 `d850fa0fb2a819cbe8196779beee40fae1410c64dcfe630d2635407033966b86`, version `1`, and
  one content fingerprint. It did not contain source paths, line locations, scanner version,
  configuration, or Git revision.
- The adapter-shaped differential config was private and project-external. It supplied only eight
  approved absolute paths, `reporters: ["json"]`, `minTokens: 10`, `minLines: 2`, `absolute`,
  `silent`, and `noTips`. It did not rely on auto-discovered `.jscpd.json` and did not pass a
  baseline or new-clone flag.

The `/tmp` paths identify the original runs; they are not repository inputs or a prerequisite for
reading this evidence. The exact fixture contents and replay procedure are retained below so a
future Change can rerun the comparison in a new empty directory. A replay can validate the stated
categorical results, but it is new evidence: it does not retroactively make a removed temporary
report or its timestamp available.

### Reproduction ledger

Run these commands from a checkout of this repository. Set `DIFF_ROOT` to a new empty directory, so
both exact versions have separate package-local `node_modules` directories:

```bash
for version in 5.0.11 5.1.1; do
  mkdir -p "$DIFF_ROOT/jscpd-$version"
  printf '{"private":true}\n' > "$DIFF_ROOT/jscpd-$version/package.json"
  pnpm --dir "$DIFF_ROOT/jscpd-$version" add --save-exact "jscpd@$version"
  node "$DIFF_ROOT/jscpd-$version/node_modules/jscpd/run-jscpd.js" --version
done
```

Create the exact differential corpus below. `outside-scope/ignored.ts` deliberately duplicates
`src/alpha.ts`, but is omitted from the config; `no-clone/unique-*.ts` are the empty-result control.

````bash
mkdir -p "$DIFF_ROOT/corpus"/{src,scripts,docs,"special path",outside-scope} "$DIFF_ROOT/no-clone"
cat > "$DIFF_ROOT/corpus/src/alpha.ts" <<'EOF'
export function duplicatedComputation(seed: number): number {
  let total = seed;
  total += 10;
  total += 20;
  total += 30;
  total += 40;
  return total;
}
EOF
cp "$DIFF_ROOT/corpus/src/alpha.ts" "$DIFF_ROOT/corpus/scripts/beta.ts"
cp "$DIFF_ROOT/corpus/src/alpha.ts" "$DIFF_ROOT/corpus/outside-scope/ignored.ts"
cat > "$DIFF_ROOT/corpus/docs/first.md" <<'EOF'
# First Markdown fixture

Repeated prose begins here and remains intentionally identical across this fixture.
Repeated prose continues with enough lexical material for the duplicate scanner.
Repeated prose ends in this deterministic fixture sentence.

```ts
export const fencedDuplicate = (input: number) => {
  const adjusted = input + 1;
  return adjusted * 2;
};
```
EOF
sed 's/First Markdown fixture/Second Markdown fixture/' "$DIFF_ROOT/corpus/docs/first.md"   > "$DIFF_ROOT/corpus/docs/second.md"
printf 'export const lineEndingDuplicate = (count: number): number => {\r\n  const next = count + 1;\r\n  return next * 3;\r\n};\r\n'   > "$DIFF_ROOT/corpus/src/crlf.ts"
printf 'export const lineEndingDuplicate = (count: number): number => {\n  const next = count + 1;\n  return next * 3;\n};\n'   > "$DIFF_ROOT/corpus/scripts/lf.ts"
cat > "$DIFF_ROOT/corpus/special path/duplicate name.ts" <<'EOF'
export const specialPathDuplicate = (source: string): string => {
  const normalized = source.trim();
  return normalized.toUpperCase();
};
EOF
cp "$DIFF_ROOT/corpus/special path/duplicate name.ts"   "$DIFF_ROOT/corpus/special path/duplicate peer.ts"
printf 'export const uniqueOne = 1;\n' > "$DIFF_ROOT/no-clone/unique-one.ts"
printf 'export const uniqueTwo = 2;\n' > "$DIFF_ROOT/no-clone/unique-two.ts"
````

Generate each version's exact private config, scan, and persist a normalized Product-relevant
projection. The command runs from the repository root so its import uses the current adapter parser:

````bash
for version in 5.0.11 5.1.1; do
  cat > "$DIFF_ROOT/config-$version.json" <<EOF
{
  "path": [
    "$DIFF_ROOT/corpus/src/alpha.ts",
    "$DIFF_ROOT/corpus/scripts/beta.ts",
    "$DIFF_ROOT/corpus/docs/first.md",
    "$DIFF_ROOT/corpus/docs/second.md",
    "$DIFF_ROOT/corpus/special path/duplicate name.ts",
    "$DIFF_ROOT/corpus/special path/duplicate peer.ts",
    "$DIFF_ROOT/corpus/src/crlf.ts",
    "$DIFF_ROOT/corpus/scripts/lf.ts"
  ],
  "reporters": ["json"],
  "minTokens": 10,
  "minLines": 2,
  "absolute": true,
  "silent": true,
  "noTips": true
}
EOF
  node "$DIFF_ROOT/jscpd-$version/node_modules/jscpd/run-jscpd.js" \
    --config "$DIFF_ROOT/config-$version.json" --output "$DIFF_ROOT/output-$version"
  DIFF_ROOT="$DIFF_ROOT" VERSION="$version" bun -e '
    import { readFileSync, writeFileSync } from "node:fs";
    import { parseJscpdJsonReport } from "./src/package-checks/duplicate-detection/jscpd/json-report.ts";
    const root = process.env.DIFF_ROOT;
    const version = process.env.VERSION;
    if (root === undefined || version === undefined) throw new Error("missing replay environment");
    const parsed = parseJscpdJsonReport(readFileSync(`${root}/output-${version}/jscpd-report.json`, "utf8"), `${root}/corpus`);
    if (!parsed.ok) throw new Error(parsed.error);
    const normalized = parsed.measurements.sort((left, right) => JSON.stringify(left.sourcePaths).localeCompare(JSON.stringify(right.sourcePaths)));
    writeFileSync(`${root}/normalized-${version}.json`, `${JSON.stringify(normalized, null, 2)}\n`);
  '
done
cmp "$DIFF_ROOT/normalized-5.0.11.json" "$DIFF_ROOT/normalized-5.1.1.json"
````

The successful `cmp` is the Product-relevant differential result. Raw reports differ in
non-consumed statistics and in 5.1.1's additive `isNew`; therefore they are intentionally not
compared byte-for-byte. Run the same scan with a two-path config for `no-clone/unique-one.ts` and
`no-clone/unique-two.ts`; it must yield `duplicates: []`. Inspect raw reports separately for their
top-level keys, duplicate-level `isNew`, and `statistics`; the adapter does not consume statistics.

For clone-baseline cases, copy `src/alpha.ts` to `reference/a.ts` and `reference/b.ts`. Create the
baseline with the initial command in the next section, then make a fresh copy for each row and apply
only the named change: prepend the same comment to both sources; convert both to CRLF; rename both
files; change `total += 30` to `total += 300` in both sources; add unchanged `c.ts`; or raise
`minLines` to `50`. For every current case substitute its exact paths into the initial command,
remove `--update-baseline`, and retain `--baseline <baseline.json>`. The historical comparison is
the retired algorithm's sorted unordered pairs of `path:startLine` values: a current pair is
existing only when that identical pair occurred in the reference result. Use a nonexistent file and
`{bad json` for the missing and corrupt controls. `5.0.11 --baseline <baseline.json>` is the
version-change control and must exit non-zero because that CLI has no baseline option.

## 5.0.11 to 5.1.1 scanner differential

| Observation | 5.0.11 | 5.1.1 | Result |
| --- | --- | --- | --- |
| Manifest bin and actual engine | `./run-jscpd.js`; `cpd 5.0.11` | `./run-jscpd.js`; `cpd 5.1.1` | Wrapper/engine agree for both isolated installations. |
| Exact-scope corpus | Five clones, exit `0` | Five clones, exit `0` | Identical normalized fragments, locations, line/token counts, source paths, and exact-scope membership. |
| Markdown prose and fenced TypeScript | Accepted | Accepted | No parser or report-path drift. |
| TypeScript multi-root, CRLF/LF, and space-containing paths | Accepted | Accepted | No normalization or path drift. |
| Excluded out-of-scope source | Absent from report | Absent from report | Exact scope remains trustworthy. |
| Explicit no-clone scope | `duplicates: []`, exit `0` | `duplicates: []`, exit `0` | Empty successful scan remains valid. |
| JSON shape used by adapter | `duplicates` plus `statistics` | `duplicates` plus `statistics`; each duplicate adds `isNew` | The parser ignores the additive field while retaining strict required duplicate fields. |

The raw report statistics differ in Markdown token totals (`52/290` format/total tokens in 5.0.11;
`126/364` in 5.1.1), so report checksums differ. The adapter neither parses nor publishes those
statistics; the normalized measurement and finding inputs are equal, so this is not an unexplained
Product regression.

The 5.1.1 manifest's static optional-platform matrix is:

| Package | OS | CPU/libc | Version | Wrapper bin mapping | Evidence |
| --- | --- | --- | --- | --- | --- |
| `jscpd-linux-x64-gnu` | Linux | x64 / glibc | 5.1.1 | `bin/jscpd` | Current-host engine and scan executed. |
| `jscpd-linux-arm64-gnu` | Linux | arm64 / glibc | 5.1.1 | `bin/jscpd` | Manifest, lockfile, and wrapper map only; not executed. |
| `jscpd-linux-x64-musl` | Linux | x64 / musl | 5.1.1 | `bin/jscpd` | Manifest, lockfile, and wrapper map only; not executed. |
| `jscpd-darwin-arm64` | macOS | arm64 | 5.1.1 | `bin/jscpd` | Manifest, lockfile, and wrapper map only; not executed. |
| `jscpd-darwin-x64` | macOS | x64 | 5.1.1 | `bin/jscpd` | Manifest, lockfile, and wrapper map only; not executed. |
| `jscpd-windows-arm64-msvc` | Windows | arm64 / MSVC | 5.1.1 | `bin/jscpd.exe` | Manifest, lockfile, and wrapper map only; not executed. |
| `jscpd-windows-x64-msvc` | Windows | x64 / MSVC | 5.1.1 | `bin/jscpd.exe` | Manifest, lockfile, and wrapper map only; not executed. |

`run-jscpd.js` selects this map from runtime OS/CPU and Linux libc, then resolves the selected
package's `bin/jscpd` (or Windows `bin/jscpd.exe`); a missing selected package exits non-zero. This
replaces the 5.0.11 six-package `cpd-*` matrix and adds Windows ARM. Static evidence does not claim
the six non-host binaries run successfully.

## Checked-in clone-baseline experiment

The experiment created a baseline from a two-file TypeScript duplicate with:

```text
node node_modules/jscpd/run-jscpd.js --min-tokens 10 --min-lines 3 --reporters json \
  --output <output> --absolute --silent --no-tips --baseline <baseline.json> \
  --update-baseline <reference/a.ts> <reference/b.ts>
```

The initial report had one clone and `isNew: true`; the written baseline was exactly:

```json
{
  "version": 1,
  "fingerprints": {
    "3e12ffe0b6fd4647": 1
  }
}
```

Each current case then ran with the same options except `--update-baseline`.

| Case | jscpd `isNew` / `newClones` | Historical `path:startLine` comparison | Assessment |
| --- | --- | --- | --- |
| Unchanged source | `false` / 0 | Existing | Agreement. |
| Line insertion in both sources | `false` / 0 | New: both `path:startLine` keys move from line 1 to 2 | Upstream fingerprint is more stable than the historical location key. |
| CRLF replacing LF | `false` / 0 | Existing in this fixture | No false new classification observed. |
| Rename/move of both sources | `false` / 0 | New: both path keys change | Upstream fingerprint is more stable than the historical location key. |
| Content edit in both sources | `true` / 1 | Existing: paths and lines are unchanged | Historical location key would miss a changed clone; upstream identifies it as new. |
| Third occurrence of the same clone | one `false`, one `true` / 1 | Existing `a:b`; new `a:c` location pair | Agreement for the newly introduced repetition. |
| Cross-area/threshold-style config change (`minLines: 50`) | no clones / 0 | No current fragment to compare | Baseline stores no configuration identity; a future owner must define how configuration changes invalidate or review it. |
| Missing baseline | exit 1; no report | Cannot compare | Tool fails closed with a request to create the baseline. |
| Corrupt baseline | exit 1; no report | Cannot compare | Tool fails closed with a baseline parse error. |
| Scanner-version change | 5.0.11 rejects `--baseline` as an unknown argument | Historical algorithm has no version provenance either | A 5.1.1 baseline cannot be validated by the prior engine; the artifact itself has no scanner-version identity. |

`--fail-on-new-clones` was deliberately not used: it turns a trusted scan with findings into a
non-zero process exit, which current adapter failure handling correctly treats as unavailable. The
first-round experiment also did not use `--baseline-from-ref`; that feature would add Git reference,
temporary-worktree, and exact-input reconstruction ownership beyond this dependency upgrade.

## Recommendation

**Do not adopt clone-baseline settlement in this Change.** Upstream fingerprints are observably more
stable than the retired `path:startLine` comparison for insertion and rename, and they detect the
content-edit false negative. However, the baseline artifact omits scanner version, configuration,
source identity, and review/update policy; 5.0.11 cannot read the feature at all. A follow-up
Decision and Change would need to define baseline producer/update review, cache identity, exact-input
and Git failure behavior, whether existing clones retain Records, and how only-new clones interact
with current finding policy before any Product integration is safe.
