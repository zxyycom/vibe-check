# Design

本 Plan 固定 Lizard `1.24.0` tag 为唯一 oracle，在 source-faithful translated closure 内实施并证明升级，同时将 Product-facing behavior 保持在已存在的 private façade/Product adapter boundary 内。

## Context

`functionMetrics` 是 Product-owned TypeScript analyzer。它仅通过 Check-private `analyzer/port-facade.ts` 接收已经由 measurement/Worker 准备的 exact input，只有 `analyzer-adapter.ts` 能消费 façade；input admission、I/O、resource/cancellation、Finding、waiver、Record、final data 和 settlement 都留在 port 外。稳定 owner 只承诺 27 readers、55 个大小写不敏感 suffix、NLOC、standard CCN 和 parameter count；不承诺 Python runtime、Lizard command、CLI 或 public parser/plugin surface。

`docs/investigations/assess-lizard-upstream-release-and-branch-delta.md` 已确认截至 2026-09-03 的正式 oracle 是 `1.24.0` tag commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`。`master` 在该报告观察点另有 5 个未发布 commits，不能成为本 Change 内容。相对 1.23.0 的 translated analyzer closure 变动集中于 GoLike、Java（含新的 `java_body_states`）、Objective-C、PHP（含新的 `php_states`）、Python 和 script-language；所有 reader family 必须作为同一 release closure 复核，而不能按热门语言裁切。

`lizard.py` 是 mixed file：`1.23.0..1.24.0` 的实际字节 diff 位于 CLI/discovery/extension-help/main 等 excluded-entry ranges；translated ranges 仍因上游行号偏移与 source identity 改变而要重新锚定和复核，但不得声称 translated behavior 有字节 diff。当前 1.23 root provenance、current evidence、legal inventory 与 Gate exact exception ledger 都必须替换为同一 1.24 closure。19 个 legacy concrete extension bodies 未变，新增 Halstead 的 3 个 extension files 也没有 Product consumer；它们都是 deferred，不注册。

## Goals / Non-Goals

Goals:

- 以固定的正式 tag 更新 source/range identity、translated source closure、file-level provenance/legal inventory、current evidence 和 parity corpus。
- 先证明 core/protocol/shared state/registry processor order，再按受影响 reader family 实施；translated internals 遵守 upstream source fidelity，边界代码遵守项目 coding style。
- 让 root provenance、source identity、oracle/deviation observations、legal inventory、test evidence 和 exact Gate exception ledger 能共同证明同一 1.24 closure。
- 在每个 behavior-changing reader family 有最小 oracle corpus、相邻 unit test 和 Case evidence；在全局验收前分别进行 correctness-only review 与不改变行为的 ai-ready/code-norm optimization review。

Non-Goals:

- 不采用、注册、运行或公开任何 Lizard extension；不更改 FunctionMetrics options、limits、Finding metric、waiver, Record、message、final data 或 Product adapter DTO contract。
- 不引入 Python、Lizard executable、CLI、runtime network lookup、public analyzer/parser/plugin API 或 generic scanner framework。
- 不同步 tag 后 `master` 的 5 commits，不采用 `--no-gitignore`，不实现 CSV/version/report/file-walk 或 discovery surfaces，也不将 Halstead 或 legacy bodies 混入 baseline sync。
- 不将 `adopt-selected-lizard-extensions` 的 consumer selection、public policy 或 runtime implementation 与此 Change 合并。

## Decisions

### Intended Change

1. **Identity and source ledger first.** 使用 `1.24.0` tag commit，而非 `master` 或 mutable release label，生成 root provenance、hash/range/target mapping、license/header/notice inventory。对每个上游范围标注 `translated`、`deferred-extension-body` 或精确 `excluded-entry-surface`，并将 root provenance 作为唯一 machine-readable mapping；current evidence 只消费或交叉验证它。
2. **Translate in lifecycle dependency order.** 先比对与 1.24 closure 相关的 analyzer core、extension protocol、shared state、registry 和 processor order；随后将受影响 readers 按 GoLike、Java/Java body states、Objective-C、PHP/PHP states、Python、script-language family 翻译。每一 family 完成后立即以 tag-derived normal/edge/malformed observations 对 function identity/range、NLOC、standard CCN、parameters、suffix selection 和 source order 做局部验证，再进入下一 family。
3. **Preserve the boundary deliberately.** `port-facade.ts` 只产生 Check-private Lizard-domain analysis，adapter 才映射既有 Product metrics；不把 source-aligned internals、registry 或 extension lifecycle 变成 export/plugin/command protocol。测试必须证明 port 只获得 exact inputs，adapter 保持 whole-input mapping 和 existing Product DTO/result behavior。
4. **Maintain current evidence, not historical compatibility.** 新 `lizard-1.24.0` evidence 以 source identity、reader-extension mapping、oracle/malformed observations 与 deviations 成组落地；删除或替换 stale 1.23 current references 时，不能读取 archive 充当 runtime/current evidence。`lizard.py` ledger 单列“excluded-only byte diff + translated-range re-anchoring”证据，防止将行号偏移误译为功能变更。
5. **Keep extensions explicitly deferred.** root provenance 清楚列出 19 legacy concrete bodies 与三个 Halstead files 但分类为 deferred/no registration。没有消费者、closed Product contract 和独立 Change 授权时，任何 extension source 都不能进入 registry、façade output 或 Product API。
6. **Gate and quality evidence are source-specific.** 重审 translated paths 的 lint/quality exception ledger；例外必须同时指向 exact rule-path instance 和 1.24 provenance/header，能移除的即移除。source identity/deviation/provenance guards、legal validation、targeted tests、test-evidence check、required/full workspace Gate 共同组成验收链；先 correctness-only code review，随后才可进行不改变已证明语义的 ai-ready/code-norm optimization。

### Resulting Impacts

- **Implementation closure:** 共享 lifecycle 的改动必须先于 reader-specific 变更；否则局部 reader patch 可能在旧 protocol/processor order 上看似通过，实际偏离 1.24。每个 family 的 implementation task 都依赖 core/protocol closure 与其 source-ledger entry。
- **Evidence migration:** 1.23 artifact 名称、source hashes、range lines、mapping counts、oracle values和 deviations 会失效。所有 current evidence 与 identity tests 必须同时切换到 1.24，且在切换期间不留下 version-mixed assertions。
- **Legal/provenance:** translated、deferred 和 excluded source 均须被 inventory；deferred 不等于忽略 license/provenance。mixed-file ranges、SPDX/header/notice 和 shipped legal inventory 与 target mapping 同一变更审查。
- **Test evidence ownership:** 改动或新增原生 test nodes、test body、Case Owner/Proves 时，必须先后运行 `bun run test-evidence -- check --root .`，维护 affected Cases，并先运行最窄的 reader/core/adapter test。已有测试若只因 source release oracle 更新，也必须说明它证明的 1.24 behavior。
- **Stable product behavior:** source-aligned corrections可能改变旧 fixture 结果，但无 oracle 证明不得改变公开 Product result schema、options 或 metric policy。extension non-registration、private imports、exact-input, cancellation/resource boundaries 和 27/55 reader capability 都需回归验证。
- **Cross-change dependency:** 本 Change 可独立完成；`adopt-selected-lizard-extensions` 只能在完成后稳定提交的 1.24 baseline 上实施具体 capability，不能反向阻塞或改变本 Change scope。

## Risks / Trade-offs

- **Source fidelity versus legacy tests:** 1.24 fixes may conflict with 1.23 fixtures. Tag-derived oracle wins, but every accepted difference needs source/range evidence and a readable deviation record; blanket fixture churn is not evidence.
- **Mixed source and legal drift:** shifted ranges or partial provenance updates can make mapping, headers and Gate exceptions internally inconsistent. Treat the source ledger as a release-wide atomic review surface and run guards before broad Gate runs.
- **Reader sharing:** GoLike and script-family helpers fan out to multiple suffixes. Family-scoped corpus must name impacted suffixes and protect unchanged consumers, otherwise an apparently local fix can regress 27-reader coverage.
- **Overreach:** translating Halstead or legacy bodies merely because they appear in 1.24 would create unowned Product behavior. Explicit deferral reduces current feature scope but intentionally leaves consumer selection to the separate Change.
- **Validation cost:** full Gate is expensive but required for cross-owner baseline, evidence, legal and Gate-ledger changes. Run targeted tests and required Gate first to make failures actionable; execute full Gate only after correctness review.

## Open Questions

无。正式 oracle、release boundary、27-reader/55-suffix target、mixed-file classification、deferred extension boundary、private Product boundary 与 adoption Change separation 已由 stable owners 和两份调查报告确定；实施中的新事实若改变其中任一项，必须先更新本 Plan 的 scope/design/tasks，而不是隐式扩张。
