# Validation Automation

## 适用范围

设置、修改或调试 CI、quality gates、workspace verification、release checks、dependency automation 或 local verification scripts 时读取本 reference。这里的 validation map 是通用起点，实际命令必须来自当前仓库脚本、文档、工具链或相邻测试。

## Validation Map

- **Compile/static**：format、lint、typecheck、generated-code freshness、dead-code checks。
- **Unit/integration**：受影响 package/crate/module 的 unit tests，跨 boundary 的 integration tests。
- **CLI/API/local tool**：command/request smoke、exit/status behavior、stdout/stderr、machine/readable output、config/defaults。
- **Schema/example/docs**：schema validation、example round trip、golden output、docs snippet freshness、link/shape checks。
- **Frontend/browser**：component tests、E2E critical paths、a11y checks、visual evidence for visual changes。
- **Package/release**：build artifact、binary/package smoke、version metadata、publish dry-run、rollback or deployment gate。
- **Dependency**：lockfile integrity、audit/license/provenance checks when dependency surface changes。
- **Cross-boundary change**：when multiple contracts move together, run the repository workspace verifier when feasible。

## Repository Command Policy

1. Prefer scripts already declared in the repository. Confirm a script exists before requiring it。
2. Use the repository package manager and lockfile policy。
3. For Rust work, use repository Cargo formatting、lint and test policy; target affected packages before workspace-wide checks。
4. For Node/TypeScript work, use the repository-approved package manager and scripts。
5. For Python helper scripts, use the repository-approved Python runner。
6. Do not hardcode build output binary paths in reusable skill rules. Resolve generated artifacts from current docs, scripts or the build produced in this task。

## Failure Triage

1. Re-run the exact failing command locally before changing code or workflow YAML。
2. Classify failure: environment/setup、compile/type/lint、unit/integration、E2E、CLI/API smoke、schema/example/docs、packaging、deployment、dependency。
3. Shrink to the smallest failing fixture、request、test name、browser action、generated artifact 或 package target。
4. Fix the underlying contract first; update the check only when it no longer matches repository policy。
5. Re-run the narrow failed check, then the wider verification that proves the declared merge risk。

## Workspace Verification Trigger

Use the repository workspace verifier, or record why it was skipped, when a work item crosses packages/crates, CLI/API plus implementation boundary, schema/examples, docs that publish command/API behavior, generated fixtures, browser E2E paths, deployment automation or package/release artifacts。

## CI Hygiene

- Required checks should map to merge risk, not historical habit。
- Slow checks should run after fast deterministic checks and be skipped for irrelevant path changes only when path filters are trustworthy。
- Secrets should be scoped to the smallest job that needs them and never exposed to pull requests from untrusted contexts。
- Cache keys must include lockfiles/toolchain versions and tolerate cache misses。
- Flaky checks need ownership and a fix path; rerun-only policy should not hide real failures。
