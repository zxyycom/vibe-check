# Change readiness 0.3 — baseline verification

## Capture identity

- **Captured (UTC):** 2026-08-24T04:54:31Z–2026-08-24T04:55:02Z
- **HEAD at start and end:** `7817de46cbfe236911d46ca6e2d1b08cd76ed222`
- **Worktree at capture end:** clean (`git status --short` produced no output).
- **Method:** Commands below ran sequentially from the repository root. No source, configuration, test, or Change-plan artifacts were changed to obtain these baseline results.

## Baseline results

| UTC interval | Command | Exit | Key result |
| --- | --- | ---: | --- |
| 04:54:31–04:54:44 | `bun run test-evidence -- check --root .` | 0 | 160 current test entities (160 Bun), mapped by 49 semantic Cases across 9 topics. |
| 04:54:44 | `bun run format -- check` | 0 | All 281 matched files use the correct format. |
| 04:54:44–04:54:45 | `bun run typecheck -- product` | 0 | Product typecheck completed without diagnostics. |
| 04:54:45 | `bun run typecheck -- scripts` | 0 | Script typecheck completed without diagnostics. |
| 04:54:45 | `bun run lint -- product` | 0 | Product lint completed without diagnostics. |
| 04:54:45–04:54:46 | `bun run lint -- scripts` | 0 | Script lint completed without diagnostics. |
| 04:54:46 | `bun run validate` | 0 | JSON syntax (12), strict schemas (5), machine artifact examples (4 sets), report examples (4), and Markdown links (168) passed. |
| 04:54:46–04:54:47 | `bun run quality` | 0 | Bound Project Run completed successfully. |
| 04:54:47–04:55:02 | `bun run verify:vibe-check-workspace:full` | 0 | Full Project Gate passed 14/14 checks; 0 failed, unavailable, or not applicable; elapsed 14.5s. |
| 04:55:02 | `git diff --check` | 0 | No whitespace errors in the then-current worktree diff. |

## Batch and independent-review evidence

| Batch | Final identities | Primary screen | Independent review | Result |
| --- | ---: | --- | --- | --- |
| 1.1 public-authoring | 40 | `/root/audit_product_authoring` | `/root/review_product_batches` | Accepted; 3 S1 resolved. |
| 1.2 execution | 37 | `/root/audit_product_execution` | `/root/review_product_batches` | Accepted; no finding. |
| 1.3 checks | 52 | `/root/audit_product_checks` | `/root/review_product_batches` | Accepted; 1 S1 resolved. |
| 1.4 machine publication | 17 | `/root/audit_product_output` | `/root/review_product_batches` | Accepted; 1 S1 resolved. |
| 1.5 development substrate | 31 | `/root/audit_scripts_development` | `/root/review_scripts_and_fixture` | Accepted; no finding. |
| 1.6 validation/governance | 71 | `/root/audit_scripts_validation` | `/root/review_scripts_and_fixture` | Accepted; no finding. |
| 1.7 delivery/consumer | 33 | `/root/audit_scripts_delivery` | `/root/review_scripts_and_fixture` | Accepted; 1 S2 resolved. |
| 1.8 examples/fixture | 9 (3 live, 6 tombstones) | `/root/audit_examples_fixtures` | `/root/review_scripts_and_fixture` | Accepted; 2 S2 resolved by complete orphan-fixture removal. |
| 1.9 repository/Skill control plane | 35 | `/root/audit_control_plane` | `/root/review_control_plane` | Accepted; 1 S2 resolved and both generated configs reviewed without manual edits. |

The recorded batch evidence includes targeted tests and the applicable local typecheck, lint, format, Test Evidence, docs, and diff checks. The independent reviews accepted all modified entries and batch coverage for unchanged/derived entries. `findings.md` is the complete S0–S2 summary; there are no deferred findings and no open S0/S1 finding.

## Final inventory and execution boundary

A final fresh discovery wrote `current-code-manifest.json`: 319 live entries plus 6 tracked-missing tombstones, for 325 identities; no unknown or symlink candidate was reported. The six tombstones are all recorded as `removed` with deletion evidence and accepted review in `review-ledger.json`.

During 1.9 primary work, an import probe was mistakenly used and triggered read-only GitHub release queries for five updaters. It did not use `--yes`, did not modify the workspace, did not perform an external write, and was stopped. The observed remote versions are observations only, not findings.

## Final acceptance results

The baseline remains point-in-time evidence for its recorded clean worktree. The following final runs close the later-worktree acceptance boundary; each listed acceptance command exited 0 unless explicitly identified as a non-acceptance attempt.

| Command or evidence | Result |
| --- | --- |
| `bun run test -- product` | Passed: 111/111 tests. |
| `bun run test -- scripts` | Exited 1 because this CLI supports only the `product` selector. This attempted command is non-acceptance evidence and is not represented as a passing script test run. |
| NUL-safe `git ls-files -z -- 'scripts/**/*.test.ts'` selection followed by `bun test` | Passed: 22 test files, 49 tests. This is the script-test replacement after the unsupported CLI selector. |
| Package API projection check | Passed (exit 0). |
| `bun run format -- check` | Passed. |
| `bun run typecheck -- product`; `bun run typecheck -- scripts` | Both passed. |
| `bun run lint -- product`; `bun run lint -- scripts` | Both passed. |
| `bun run test-evidence -- check --root .` | Passed: 160/160 current entities mapped by 49 Cases. |
| `bun run validate`; `bun run quality`; `bun run decisions -- check` | All passed. |
| Ledger verifier | Passed: 319 live entries plus 6 tombstones close against the fresh manifest. |
| Full Project Gate | Passed 14/14 checks; candidate `c98d148d5857`; elapsed 15.9s. |
| Change Plan check | Passed before final checkbox update at 15/20 completed tasks; the post-update structural check is recorded below. |
| `git diff --check` | Passed. |

`/root/review_final_code_diff` independently reviewed the complete code diff and returned PASS with no blocking issue, confirming the coding-style boundary and minimal-abstraction judgment. Together with the accepted batch reviews, this supplies the independent-review evidence for all modified entries and batches.

## Final integration checks actually run

| Command | Result |
| --- | --- |
| `bun changes/audit-and-improve-current-code-quality/evidence/verify-current-code-ledger.mjs check --root .` | Passed: 319 live entries and 6 tombstones close against the fresh manifest. |
| `bun run change-plan -- check changes/audit-and-improve-current-code-quality` | Passed after the final checkbox update; active Plan, 20/20 tasks completed. |
| `bun run format -- check` | Passed. |
| `bun run validate -- docs` | Passed after the documentation update. |
| `git diff --check` | Passed: no whitespace errors. |

## Proof boundary

These results prove the recorded commands, counts, and review conclusions for the checked worktree. They do not prove behavior outside the checks' implemented coverage. The unsupported `bun run test -- scripts` attempt remains a failure of that selector interface, not a failed script suite or an acceptance gate.
