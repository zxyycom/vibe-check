# Design

本修订将 Gate 的调用级 aggregate 与 producing Check 的领域 finding policy 分开：Gate 只显式聚合已选 eligible terminal statuses；Check 自己决定 finding 是否阻断，并保留它产生的完整事实。

## Context

- **已实现的旧基线（2026-08-29）：** 四项 direct repository-quality Checks 在同一 bound Gate Run 中执行，并因 quality entry 的 aggregate exclusion 而不影响 assurance aggregate。该实现事实由 `observe-repository-quality-checks-inside-project-gate.md` 记录为 aligned。
- **当前已验证（本轮最窄测试与 docs validation）：** Gate 对 required、full 与 local partial 从同一 eligibility projection 配置 `mode: "all"` 并选择全部 eligible IDs；findings、messages、Records 和 final data 不是 aggregation input。`aggregate-all-eligible-project-gate-check-statuses.md` 已修订并归档旧 aggregate-exclusion Decision。
- **质量 evidence 快照：** 用户原始运行是 27 file-metrics findings、129 function-metrics findings、2 Markdown links；最终真实 Gate 是 28、134、2。数量差异是具体 invocation 的 evidence，不等于本轮已完成修复，也不构成稳定 release 配额；release-quality Decision 要求发布时处置届时全部已知 findings。
- 四项 Gate repository-quality Checks 已以各自 options 明确 non-blocking finding policy；area quality Checks 和 `markdownLinkValidation` 的 public default 都保持 blocking。可信 finding 形成 passed、完整 final data/Records 与 warning；scanner/source/parse failure 的 four-state `unavailable` 不属于 finding policy。
- Gate integration test 已使用单一 synthetic fixture 和 `.log/project-gate-tests` 下 test-owned invocation directory，证明 output override、paired machine facts 与 cleanup，而不扫描当前仓库或混杂既有 output。
- Gate timing 现以 candidate preparation、adapter/setup 和 Product Run 三段解释总 `elapsed-to-initial-result`；diagnostic logging 或 machine publication 至少一项启用时，Run 创建阶段捕获一次 instant，`run.json` timestamp 与已启用的日志文件名在两项同时启用时共享它；两项都禁用时不读取/序列化 wall clock。`run.terminal-before-log-close` 只表示 close 尚未确认。对应 timestamp/phase Decisions 已演进为 aligned；这不是建立 hard performance budget。
- Gate root 保持由实测物理资源所有权导出的三路并发：candidate lifecycle/provider、consumer 与独立 test lanes；`tests-scripts-validation` 的临时 schema/example material 写入只和会读取该 material 的 schema/example validators 共享 documentation-materials mutex。JSON grammar 与 Markdown path validators 不在这条竞争链中。

## Goals / Non-Goals

目标是让所有 Gate eligible statuses 进入同一个显式 aggregate，并让 non-blocking quality 通过 Check-local policy 而非 Gate exclusion 表达；完成 public Markdown Link policy、可隔离的测试 artifact、清楚的 Gate output/timing/log 语义与可区分的 docs validation owner。非目标是本轮直接修复两条 Markdown 断链、下调或吞掉 unavailable、从 Records 聚合、恢复 nested repository Run/quality command/quality-only artifact，或把 performance advisory 变为预算/硬门禁。

## Decisions

### Intended Change

1. Gate definition 从同一 entry projection 派生 eligible identity set 和 explicit controls：对于 required、full 和 local partial，`checkAggregation` 使用 `mode: "all"` 且选择全部 eligible IDs。Gate adapter 只消费 package-produced aggregate、definition/output/progress facts，不遍历 raw Check snapshot 或 Record data 重新计算。
2. Repository-quality policy 在 producing Check configuration 中明确 `findingPolicy: "non-blocking"`，以便当前可信 quality findings 结算为 passed（带完整 final data、Records 和 warning）。`duplicateDetection`、`fileMetrics`、`functionMetrics` 和新的 `markdownLinkValidation` finding policy 仍各自拥有 candidate/threshold/parser/Record identity；公共默认一律为 `blocking`。
3. `markdownLinkValidation` 的 public options、resolved defaults 和 declarations 增加合法 `findingPolicy`。blocking finding 使 owning Check failed；non-blocking finding 不截断扫描，保留 Record/final data 并以 actionable warning 结算 passed；source selection、decode、parse、root/canonicalization 与 target I/O unavailable 保持 `unavailable`。
4. 质量 Gate 测试创建仅服务自身 fixture 的 project root 与 output directory，不扫描本仓库；测试 runner 只删除自己创建的 test-owned path。真实 required/full Gate evidence 仍使用真实 repository scope，不能用 fixture 替代。
5. Gate output 用通用字段/renderer 说明 selected and eligible statuses、aggregate policy 和 aggregate result，不为 quality 建二次报告器。elapsed observation 明确其测量起点与“initial result”截止阶段；diagnostic logging 或 machine publication 至少一项启用时才在 Run 创建阶段一次捕获 run timestamp，两项同时启用时共享它，两项都禁用时不读取/序列化 wall clock；terminal log 仍只表述 terminal invocation transcript。两个 docs link validator 使用不同、可在输出和文档中识别的名称。
6. 用户原始 27/129/2 与最终 28/134/2 findings 仅作为 evidence 快照记录并交接给独立的公开 release readiness Decision：它要求发布时处置和复验届时全部已知 findings，但不是本 Change 的实现或验证任务。它们可在本 Change 的 Gate policy 迁移前暂时 non-blocking，却不得被误报为已解决或发布允许。

### Resulting Impacts

1. Gate entry metadata 的 `contributesToAggregate` / quality exclusion 概念需要删除或改为不影响 all eligible aggregation 的普通 metadata；definition、profile/tag selection、controls、adapter 和 output tests 必须验证同源 projection。
2. `markdownLinkValidation` 的 config schema、default check、constructor、parser/final-data shape、warning messages、Records、public inventory/guide/examples and types 需同步；发布材料与 runtime 不可只更新一侧。
3. `unavailable` 的 scanner/source/parse tests 必须单独保留：non-blocking finding policy 不能把 infrastructure/parse unavailability 转为 passed warning，也不能绕过 aggregate unavailable policy。
4. test files、fixtures 与 Case owner/proves 的修改触发 test-evidence review；test artifacts 不得借用或清理既有 `.log/project-run` inventory。
5. stable docs、Case prose 与 timing/log current facts 已在实现和最窄测试后同步；Gate aggregation、Markdown policy、invocation timestamp 和 phase timing Decisions 已按 evolve 维护为 aligned，旧前序保留 archived/aligned 历史。release-quality Decision 因尚未处置 findings 保持 active/unaligned。
6. public release 仍须遵循现有 candidate/consumer/registry authorization 条件；新的已知-quality remediation 条件由独立 Decision 和后续工作承接，不替代或放宽它们，也不阻断本 Change 完成。
7. docs-materials mutex 继续是 Gate scheduler 的最小资源边界：仅 `tests-scripts-validation`、`docs-schema-validator` 和 `docs-example-validator` 持有相同 named mutex；它不构成“质量 Check 特例”、docs tag-wide serialization 或新的 aggregate input。

## Risks / Trade-offs

- `all` aggregation 会使 raw failed/unavailable quality statuses影响 Gate exit；因此非阻断必须由 Check policy正当形成 passed，而不能用 aggregate exclusion 隐藏。
- 将当前 findings 设为 non-blocking 保留开发期可运行性，却有把 debt 误看成 release-ready 的风险；release Decision 和独立 evidence 必须防止该误读。
- Markdown Link public policy 扩大契约与验证面；默认 blocking、closed literals 和 direct unavailable tests 限制兼容性/安全风险。
- test fixture 隔离可能失去真实仓库 coverage；以单独的真实 Gate/release evidence 保留该边界，避免 fixture 本身污染或扫描工作区。
- 更细的 elapsed/log/timestamp output 语义可能揭示历史命名不精确；应以真实 invocation lifecycle 约束名称，而不是仅重命名 presentation。

## Open Questions

- “public release 前处置”是否要求每个 finding 归零，或允许有经用户确认的独立 baseline/waiver，须由 release owner 在具体 remediation Change 中给出可验证的完成判据；本轮不能默认 waiver。
