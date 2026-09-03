# Proposal

将 Check-private、source-aligned Lizard TypeScript port 的正式 baseline 从 1.23.0 同步到固定的 1.24.0 release tag，并以可复核的 provenance、current evidence 与测试闭合这次维护性升级。

## Why

当前 `functionMetrics` 已完成不依赖 Python/Lizard runtime 的 1.23.0 hard cut，但 `assess-lizard-upstream-release-and-branch-delta.md` 已确认 `1.24.0`（commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`）是截至 2026-09-03 的最新正式 release。该 release 包含会改变 reader 函数识别、范围或 complexity 语义的修复。若继续将正式 release 用作 source-aligned oracle，就必须更新 translated closure 与证明材料，且不能把未发布 `master`、可选 extension 或 Product contract 扩张混入此次同步。

## Outcome

完成后，`functionMetrics` 的默认 pipeline 在不启用任何 optional extension 的前提下，对 Lizard `1.24.0` tag 的 27 readers / 55 个大小写不敏感 suffix 保持 source-aligned parity；private port façade 与 Product adapter 分层、既有公开 Product contract 和 exact-input 行为保持不变，且 provenance、legal inventory、current oracle/deviation/source-identity evidence、测试和 Gate 证据都可共同复核这一 baseline。

## Scope

### Intended Change

- 仅以 Lizard `1.24.0` tag commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 为 source identity/oracle；不得以 `master`、网络查询结果或“latest”替代它。
- 先按 source-aligned core、protocol、shared state、registry/processor order 的闭包复核，再翻译并审阅 release 中受影响的 GoLike、Java/`java_body_states`、Objective-C、PHP/`php_states`、Python 与 script-language reader 行为；翻译目录追求一比一 source fidelity，手写 façade、adapter、Worker、Check 与测试按项目规范维护。
- 更新根 provenance、source hash/range/target mapping、SPDX/header/notice 与 shipped legal inventory；重建与 `1.24.0` 对应的 current source identity、reader-extension mapping、oracle/malformed observations 与 deviation evidence，并用 root provenance 作为唯一 machine-readable mapping。
- 为全部 translated、`deferred-extension-body` 和 `excluded-entry-surface` source ranges 建立或更新完整 ledger；特别重新锚定和复核 mixed `lizard.py` 的 translated ranges，同时记录其实际字节 diff 只属于 CLI/discovery/extension-help/main 等 excluded entry surfaces。
- 为 affected readers、core/protocol、private boundary、exact-input 和 identity/provenance guards 更新最小而充分的测试与 Case evidence；重审 translated-only quality/Gate exception ledger，只保留有 `1.24.0` source provenance 支撑的精确 rule-path instances。

### Resulting Impacts

- **Reader parity：** release 修复可能改变函数 identity/range、NLOC、standard CCN、parameter count、suffix selection 或 source order。实现与 normal、edge、malformed corpus 必须以 `1.24.0` oracle 判定正确性，不为保留旧 fixture 而偏离 source。
- **Evidence and provenance：** 旧 `1.23.0` current evidence 不得与新 source/range 混用，也不得从 archive、临时 clone 或运行时网络输入取得事实。root provenance、legal inventory、source identity、oracle/deviation guards 与 Gate ledger 必须同源更新并能互相验证。
- **Stable product boundaries：** `functionMetrics` 仍只提供 NLOC、standard CCN 与 parameter count；保持 27 readers/55 suffixes、private façade/Product adapter、exact-input、resource/cancellation、Finding、waiver、Record/final data 和 settlement contracts。不引入 Python/Lizard runtime、CLI、public parser/plugin API 或 generic scanner framework。
- **Deferred extensions：** 19 个 unchanged legacy concrete extension bodies 及新增 Halstead 的 3 个 extension files 都以 deferred/no registration 记录；不实现、采用或公开它们。`adopt-selected-lizard-extensions` 是独立 Change，不能与本 Change 合并，任何 adoption runtime work 硬依赖本 Change 完成后的稳定 1.24 baseline。
- **Verification and owners：** `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md`、`docs/maintenance-lizard-upstream-advisory.md`、相关 Decision、testing Case、root legal/provenance owner、analyzer/adapter tests 和 Project Gate evidence 需要按实际变更同步或复核；required 与 full workspace Gate 都是本 Change 的验收证据。

## Success Criteria

1. 所有 port source、range、hash、SPDX/header/notice、deferred/excluded classification 与 root provenance 都明确对应固定 `1.24.0` commit，混合文件 ledger 可解释 `lizard.py` 的 excluded-only byte diff 与 translated-range re-anchoring。
2. GoLike、Java、Objective-C、PHP、Python 和 script-language 的 1.24 behavior，以及其 shared core/protocol/registry dependencies，都有 source-aligned implementation review 和针对 normal、edge、malformed inputs 的 oracle/parity evidence；默认 reader registry 仍为 27 readers / 55 case-insensitive suffixes。
3. current source-identity、reader-extension mapping、oracle/malformed observations 与 deviation evidence 已完全移至 `1.24.0`，不会读取 archive 或混用 1.23 evidence；identity/provenance guards、legal checks 和 exact Gate exception ledger 全部通过。
4. 没有 optional extension 被注册、翻译为可运行 capability 或暴露到 Product contract；19 个 legacy body 和 3 个 Halstead files 均明确 deferred，CLI/report/discovery、`--no-gitignore`、CSV/version/file-walk 和 tag 后 `master` 增量均未进入 implementation。
5. 受影响 analyzer、adapter/integration、source identity/deviation/provenance、boundary/import 与 test-evidence checks 均通过；`bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full` 均通过，最后完成 correctness-only review 和 ai-ready/code-norm optimization review，且未借优化改变已证明行为。

## Affected Owners

- `docs/checks/function-metrics.md`：公开 capability、27 readers/55 suffixes、private port、exact-input 与结果边界。
- `docs/scanner-dependencies.md`：内置 analyzer、private façade/Product adapter 调用链和 translated/source-fidelity responsibility。
- `docs/maintenance-lizard-upstream-advisory.md` 与 `docs/decisions/track-lizard-supported-languages-with-upstream-advisory.md`：maintenance advisory baseline 与离线 Gate boundary。
- `docs/decisions/isolate-lizard-port-behind-check-private-interface.md`、`docs/decisions/replace-lizard-runtime-with-product-owned-typescript-analyzers.md`、`docs/decisions/preserve-applicable-upstream-licenses-for-translated-analyzers.md`：private architecture、hard cut 与 source-license direction。
- `licenses/` root provenance/legal inventory、`src/package-checks/function-metrics/analyzer/**`、其 adapter/measurement integration 和 `docs/testing/cases/{function-metrics-analyzers,translated-function-analyzers-*,check-owned-scanners,repository-tooling}.md`：implementation、evidence 与 test owners。
- `docs/script-tooling.md` 及 Project Gate exact quality exception ledger：translated-only quality rules、workspace verification and Gate evidence。
