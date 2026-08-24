# Project Gate optimization handoff

## Status and scope

The Project Gate authoring optimization is implemented, accepted, and archived under
`changes/archive/align-project-gate-with-native-check-authoring/`. This handoff does not authorize or
claim an npm registry lookup, publish, registry install, release version, or other external write.

The implementation and stable-owner content is committed as
`e8e0387532756cdd2717852b20aabf16a33f3454`. The acceptance evidence below was collected immediately
before that commit from the same implementation and stable-owner content; the Change artifacts and
current navigation were then archived separately.

## Formal bindings and selection

The retained root commands are:

| Root | Binding | Selected profile |
| --- | --- | --- |
| `verify:vibe-check-workspace` | `bun scripts/project-gate/index.ts` | `required` by default |
| `verify:vibe-check-workspace:required` | `bun scripts/project-gate/index.ts --profile required` | `required` |
| `verify:vibe-check-workspace:full` | `bun scripts/project-gate/index.ts --profile full` | `full` |

`--profile required|full` is the only profile override. The adapter does not infer a profile from CI
or other ambient state. `--disable-tag` remains a direct local partial-run control and is absent from
all formal root bindings.

Required and full currently select the same identity set. Full still means an explicit selection of
all current entries; it does not create a full-only Check merely to make the profiles differ.

```text
typecheck-product
lint-product
typecheck-scripts
lint-scripts
format-check
repository-quality
docs-json-validator
docs-schema-validator
docs-example-validator
docs-links-validator
decision-records
test-evidence
test-evidence-rule-tests
git-diff-whitespace
```

## Assurance inventory

| Identity | Execution boundary | Assurance owner and exact responsibility |
| --- | --- | --- |
| `typecheck-product` | Process-backed | The Product TypeScript scope supplies the pinned `tsgo` invocation for `tsconfig.product.json`. |
| `lint-product` | Process-backed | The Product lint scope supplies pinned Oxlint with `--deny-warnings` over `src/product`. |
| `typecheck-scripts` | Process-backed | The scripts TypeScript scope supplies pinned `tsgo` for root `tsconfig.json`; it does not prepare a candidate. |
| `lint-scripts` | Process-backed | The scripts lint scope supplies pinned Oxlint over the complete `scripts` tree, including Foundation source and tests. |
| `format-check` | Process-backed | The workspace format owner supplies pinned Oxfmt check mode and the single workspace target set. |
| `repository-quality` | Process-backed | The exact private consumer runs `mise exec -- bun scripts/quality/scan.ts`; it has no dependencies and does not call the prepare-and-run quality root. |
| `docs-json-validator` | Native | Calls the import-safe JSON validation task directly. |
| `docs-schema-validator` | Native | Calls the import-safe schema validation task directly. |
| `docs-example-validator` | Native | Calls the import-safe current machine/report example validation task directly. |
| `docs-links-validator` | Native | Calls the import-safe local Markdown link validation task directly. |
| `decision-records` | Native | Calls `validateDecisionRecords()` and maps its structured validity result. |
| `test-evidence` | Native operation with internal processes | Calls `checkTestEvidence()` directly. The same Check signal reaches its ast-grep scans and Bun JUnit child; the complete supported Bun surface is the sole Gate test fact. |
| `test-evidence-rule-tests` | Two-step process-backed | Checks the pinned ast-grep version and rule fixtures, preserving only the process steps that actually ran in one Check transcript. |
| `git-diff-whitespace` | Process-backed | Runs `git diff --check` at the module-resolved repository root. |

Every project-private entry has exactly `check`, `profiles`, and `tags`. The `Check` owns its identity,
options, dependencies, and execution. The entry collection is created in the exact private candidate
consumer domain, so its `Check` type resolves to the same installed package as the bound Run.

Eligibility wrapping and aggregation both consume the same normalized selection and entry
collection. Excluded entries retain raw `not-applicable` facts with `profile-excluded` or
`tag-disabled`; only eligible IDs enter the explicit all-of aggregation. Because the current formal
profiles have identical membership, `profile-excluded` is proven with a full-only fixture, while the
current catalog's local partial run proves `tag-disabled` end to end.

## Process evidence and adapter closure

Native Checks do not create empty transcripts. Validation failures preserve a presentation-safe
diagnostic code/count Record and matching terminal message without copying raw diagnostics;
unexpected operation errors map to unavailable and cancellation retains priority. Process-backed Checks pass the Product Run
`AbortSignal` to their child, write command/status/signal/error/stdout/stderr to a Check-local
transcript, and distinguish process, exit, transcript, and cancellation unavailable reasons.
Nonzero exits create one `command-failure` Record and one presentation-safe `command-failed`
message containing only exit, signal, and transcript basename.

The adapter prepares a candidate before loading the private consumer, checks that the resolved
installed entry matches the preparation result, and only then creates the invocation log directory.
The successful adapter test proves one preparation, one consumer load, one log-directory creation,
and one bound Run per invocation. `repository-quality` uses the scan-only path, so it cannot re-enter
candidate preparation. The independent `quality` root still owns its own prepare-and-run lifecycle;
`bun run quality` passed after this cutover.

The adapter maps a completed, warning-free, progress-successful, passed package aggregate to exit
`0`; other completed aggregate/effect/warning closure maps to `1`; invalid controls, candidate or
import failure, malformed facts, or execution failure map to `2`. A direct invalid-profile smoke
returned exit `2` without preparing or running a candidate.

## Foundation and caller closure

Foundation remains repository-owned source under `scripts/tools/foundation/src` with its existing
tests. The following historical package envelope was removed:

- `scripts/tools/foundation/package.json`;
- `scripts/tools/foundation/tsconfig.json`;
- the pnpm workspace and lockfile importer;
- Foundation-only development CLI scopes and `foundationFormatTargets`;
- the four Foundation Gate identities.

Its TypeScript, lint, format, and test facts are now owned respectively by `typecheck-scripts`,
`lint-scripts`, `format-check`, and `test-evidence`. Filtered caller searches found no current package
cwd, deleted config, scoped wrapper, retired Gate identity, `product-tests`, or quick/full quality
identity reference in implementation, tests, or stable owner docs.

Retained CLI adapters remain independent human/AI workflows:

- format, lint, typecheck, and Product test roots parse their own arguments and map process output;
- direct docs and root validation adapters preserve default-all and focused task selection;
- Decision Records and Test Evidence CLIs retain query/check output and exit mapping;
- the Test Evidence rule CLI retains its focused rule-test workflow;
- the quality root retains locked scanner binding plus candidate prepare-and-run.

All import-safe capability modules use main guards and perform no work, console output, or exit-code
mutation during import. The Gate consumes the operations or exact process invocations, not the CLI
lifecycle.

## Exact package candidate

`bun scripts/package-candidate/prepare.ts` was invoked after implementation. It returned `reused:
true` only after `preparePackageCandidate()` rechecked the matching input fingerprint, tarball,
staging/install state, and resolved entry.

| Fact | Current value |
| --- | --- |
| Candidate version | `0.0.0-local.1057c5d542f0` |
| Input fingerprint | `1057c5d542f0453654c1702010659573394eb0331c8e5e8ae6d89fe82cfbeab7` |
| Tarball | `.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.1057c5d542f0.tgz` |
| Tarball SHA-256 | `f467dc9aff1436fb8f4f37d4586a9e92a7fea26e3dd51d337d67d0879a5ea76e` |
| Installed entry | `scripts/quality/node_modules/vibe-check/index.mjs` |
| Installed entry SHA-256 | `74a201506adf85dd2ef743f5a0525acb1e2af3ad2fbee43bc20c95618c1acb59` |
| Tar inventory | 116 entries: `package.json`, `README.md`, `index.mjs`, and 113 declarations |

The package API documentation projection check, physical candidate lifecycle test, isolated external
Bun consumer, candidate preparation-failure boundary, receipt/installed-entry comparison, and tar
inventory checks all passed. This candidate identity is local acceptance evidence only; it is not a
registry version or publish claim.

## Verification evidence

The following evidence passed in the current worktree:

- Project Gate entry/selection/adapter, Definition/native/multi-process, and process-helper tests: 15
  tests;
- docs/root validation CLI default and focused-selection tests: 4 tests;
- Test Evidence top-level, ast-grep, and real Bun-child cancellation tests;
- `bun run test-evidence -- check --root .`: 158 current Bun entities, all mapped by 49 Cases across
  10 topics;
- Product and scripts typecheck and lint; workspace format check; docs validation; package API docs
  projection; `pnpm install --frozen-lockfile`; Decision checks; Change Plan checks; and
  `git diff --check`;
- package candidate tests: physical lifecycle, isolated consumer, and failed-preparation quality
  boundary;
- independent `bun run quality` prepare-and-run workflow;
- no-argument root, explicit required root, and explicit full root: 14 passed, 0 failed, 0 N/A, 0
  unavailable;
- local `--profile required --disable-tag quality`: 13 passed and one raw `tag-disabled` N/A, with a
  passed eligible aggregate;
- invalid `--profile`: adapter exit `2` before candidate work.

Representative current Gate log roots are:

```text
.log/project-gate/2026-08-23T17-41-05.983Z-1009675-9ab4d1ba-fc28-44de-b3f5-ea97a33c5272  # default required
.log/project-gate/2026-08-23T17-41-19.818Z-1010976-60224e77-2d54-4b3b-bfa3-fd17b679667b  # explicit required root
.log/project-gate/2026-08-23T17-41-36.310Z-1012303-5092a376-e2f6-4522-ba86-3fab1385af50  # explicit full root
.log/project-gate/2026-08-23T17-41-49.953Z-1012301-185c3ce1-f20f-41ef-aa2a-6e3ee007cb8f  # quality tag disabled
```

Each complete formal run contains the eight expected real-process transcripts. The partial run has
seven and no `repository-quality.log`, proving that its excluded Check did not start.

## Revalidation and downstream boundary

Re-run candidate preparation and replace this candidate identity if any candidate fingerprint input,
tarball, staging/install state, or resolved entry changes. Re-run the focused Gate tests, Test
Evidence closure, docs/type/lint/format checks, and formal required/full roots if the Gate catalog,
selection, operations, process helper, quality consumer, Case ledger, or stable owner docs change.

The Decisions `default-project-gate-to-required-profile.md` and
`integrate-foundation-into-workspace-assurance.md` are now `active + aligned`. Public distribution is
owned by `publish-public-api-only-npm-package`; it must revalidate this handoff and current candidate,
obtain separate authorization, and establish registry facts before any external action.
