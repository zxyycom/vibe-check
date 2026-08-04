本 tasks 清单把 config v2 与文件级 policy resolution 拆成可验证步骤；它是临时 change artifact，任务 1.1 完成前不得执行任何实现任务。

## 1. Blocking contract audit

- [ ] 1.1 **BLOCKING: do not execute task 2.1 or any later implementation task until this item is complete.** Audit the applied `introduce-content-quality-foundation` registry, exact-input, observation/finding, output-v2, and cache-projection contracts against every spec in this change; audit all proposed content/security changes for unique optional check-section paths, complete base schemas, neutral contributions, stable check IDs, profile/request semantics, overrideable versus base-only leaves, and path eligibility; resolve every mismatch in the common owner rather than allowing a feature-local merge engine or required v2 section addition; confirm `proposal.md`, specs, `design.md`, and this task list retain one goal, valid capability IDs, temporary/unapproved status, no edits outside this change, and no unanswered Open Questions; finally run `bun run decisions:list` and confirm the active fixed-version/neutral-default decisions still support the chosen single v2 hard cut, recording a new decision only if a genuinely new durable choice remains.

## 2. Config v2 and schema projection

- [ ] 2.1 Add failing config tests for required `overrides`, v1 migration diagnostics, optional registered feature sections, omitted-section skipped semantics, duplicate fragment paths/check IDs, duplicate/empty override names, unsafe/invalid globs, absent-base patches, empty patches, unknown/null/wrong-type leaves, nested partial objects, and array replacement.
- [ ] 2.2 Refactor the Product-owned check schema source so it deterministically composes required core plus optional registry-owned feature sections and derives closed partial override patches without duplicating the field tree.
- [ ] 2.3 Implement `SemanticProjectConfigV2`, detached parsing, semantic post-validation, and the single-active v2 migration error; remove v1-only runtime assumptions rather than retaining a dual reader.
- [ ] 2.4 Regenerate and validate the composed editor schema, neutral default, init bytes, canonical examples, fixtures, and repository-owned `.vibe-check/config.json` from the common source.

## 3. Per-file policy resolution

- [ ] 3.1 Add failing resolver tests for normalized project-relative matching, no-match behavior, document-order later-wins leaves, nested object patches, whole-array replacement, immutable outputs, and winning provenance.
- [ ] 3.2 Implement one Config-owned pure resolver and invocation-local memoization that returns complete immutable `ResolvedFilePolicy` values.
- [ ] 3.3 Add current/baseline/fallback tests proving temporary checkout paths cannot affect matching and all phases consume the same invocation-owned config snapshot.

## 4. Scope, capabilities, and cache identity

- [ ] 4.1 Add failing scope tests proving overrides can narrow descriptor exact inputs but cannot reinclude globally excluded/generated/uncollected paths or change code-area and acceptance policy.
- [ ] 4.2 Attach resolved file policy to normalized inventory handoff and update registered capability selectors to consume only their owned subtree before adapter startup.
- [ ] 4.3 Add cache-key tests for relevant per-file leaf changes, equivalent resolved policies, override-name-only edits, and unrelated capability settings.
- [ ] 4.4 Implement descriptor-owned capability policy projections in cache identity and verify stale entries cannot be reused when an outcome-affecting resolved leaf changes.

## 5. Explain-config workflow

- [ ] 5.1 Add CLI contract tests for one/two positional parsing, `--config`, help, root escape rejection, invalid config, non-existent candidate paths, deterministic provenance, exit codes, and absence of scanner/baseline/cache/artifact side effects.
- [ ] 5.2 Implement `explain-config` routing through production root/config selection and the shared resolver, with a human-readable distinction between config/glob resolution and actual inventory membership.
- [ ] 5.3 Update root/configuration/CLI owner docs and examples so override order, arrays, prohibited fields, migration, and explain semantics are independently recoverable by users and AI agents.

## 6. Verification

- [ ] 6.1 Run the narrow Product config, schema, scope, metrics/cache, CLI, init, and baseline test suites plus `bun run test-evidence:check` for every changed native test/Case mapping.
- [ ] 6.2 Run product import/typecheck/lint/dependency checks, `bun run validate`, and `bun run verify:vibe-check-workspace:required`.
- [ ] 6.3 Review the final diff for a single config/schema owner, no feature-local merge path, no v1/v2 dual reader, no global-scope expansion, and no undocumented public contract drift.
