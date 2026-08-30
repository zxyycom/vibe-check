# Proposal

本 Change 修订 Project Gate 的质量与性能集成计划：Gate 对同次 selection 的所有 eligible Check statuses 使用显式 `all` 聚合；仓库质量 finding 的非阻断语义由 producing Check 的公开 policy 形成，而不是由 Gate 排除事实来形成。

## Why

旧实现使四项仓库质量 Check 直接运行，但以 entry 元数据把它们排除在 assurance aggregate 外。本轮用户确认该分层错误：aggregation 只能消费 eligible Check 的 settled status，不能从 findings、messages 或 Records 归约结果，也不能用 entry exclusion 伪造“非阻断”。用户原始运行的初始快照为 27 个 file-metrics finding、129 个 function-metrics finding 和 2 条 Markdown link finding；最终真实 Gate evidence 为 28、134、2。两者都记录数量变化而不构成稳定门槛：本 Change 暂不修复 findings，公开发布前须处理届时全部已知 findings。

旧质量 integration 测试曾扫描当前仓库并混杂 output；本 Change 已将其迁移为 test-owned fixture/artifact。最终仍需以 required/full Gate 验证 Gate aggregate 输出、性能 elapsed 阶段、仅在 diagnostic/machine output 启用时捕获的 run timestamp、terminal log 语义和两个 docs link validator 名称的真实 repository evidence。

## Outcome

required、full 与 local partial Gate 都将同次 selection 的全部 eligible Check statuses 传给显式 `all` aggregation。四项仓库质量 Check 仍直接执行，但以各自公开的 `findingPolicy`（默认 `blocking`）决定自己的 passed/failed 状态；当前 Gate repository policy 明确选择 `non-blocking`，使可信 findings 连同完整 Records、final data 与 warning 留在 passed Check 中。scanner/source/parse 不可用继续结算为普通 `unavailable` 并由 aggregate policy 处理。Gate 不以 findings/messages/Records 作为 aggregation input，也不改写 producing Check outcome。

本 Change 还将使 Gate 质量测试使用 test-owned fixtures/artifacts，明确通用聚合与输出、性能 elapsed 的阶段语义、仅在 diagnostic/machine output 启用时的一次 run timestamp 捕获、terminal log 语义及 docs validator 名称。已知质量 finding 的实际修复单独延后，但在公开 package release 之前是明确的必经条件。

## Scope

### Intended Change

- 从 Gate entry 的 quality-specific aggregate exclusion 迁移到“所有 eligible Check statuses 的显式 `all` aggregation”；删除任何以 findings、messages 或 Records 重算 Gate result 的路径。
- 为 `markdownLinkValidation` 建立公开 `findingPolicy`，默认 `blocking`；和 file/function/duplicate quality Checks 一样，non-blocking finding 必须由 producing Check 以 passed result、完整 final data/Records 与 warning 表达。Gate 的 repository-quality policy 对当前可暂缓的 findings 采用明确 non-blocking 配置。
- 保留 scanner/source/parse unavailable 的 ordinary `unavailable` 语义，不将其降级为 finding/warning，也不通过 Gate 改写为 passed；由 all aggregate 的现有 unavailable policy 处理。
- 将质量 integration 测试从真实仓库扫描和混杂 invocation output 中剥离；所有测试 artifact 置于 test-owned directory，并只清理自己创建的内容。
- 使 Gate output 表达通用 aggregate policy 与 selected/eligible status facts，分别记录/测试 elapsed 的可解释阶段、仅在 diagnostic logging 或 machine publication 至少一项启用时一次捕获的 run timestamp，以及 terminal log 的稳定语义；区分 docs link validator 的名称与职责。
- 保持实测的 Gate 并发资源边界：只让 `tests-scripts-validation` 与会读取其临时改写材料的 docs schema/example validators 共享 documentation-materials mutex；不因同属 docs tag 串行 JSON grammar 或 Markdown path validators。
- 记录用户原始 27/129/2 初始快照与最终 28/134/2 Gate evidence 的差异，并将公开发布前届时全部已知 findings 的处置和复验交接给独立 release-quality Decision；本 Change 不修复两条断链、不处理这些 findings，也不声称质量已通过。

### Resulting Impacts

- required/full/partial 的 definition、eligibility、controls、adapter exit mapping、progress/machine evidence 与测试必须从同一 eligible identity 集合派生，并验证 `all` aggregate 对 passed、failed、unavailable、not-applicable 与 empty 的既有 policy。
- Markdown Link 的 public configuration、constructor/default validation、final-data/Record/message contract、package guide/declarations/examples 与 semantic test evidence 必须一起更新；默认兼容性保持 blocking。
- Quality records、messages 与 warnings 继续是 Check-owned facts：Records 不能成为 generic warning 或 aggregate source，Gate 不能根据它们改写 status；non-blocking policy 也不遮蔽 unavailable。
- 测试 owner 需要维护 Case/Test Evidence；新增、删除或改写测试正文/Case 前后必须按 test-evidence 流程闭合。
- Gate/log/docs owner、Case prose 与长期 Decisions 已在代码、最窄测试和 docs validation 后同步；release-quality Decision 继续是 active/unaligned future condition，不证明 findings 已修复或公开发布已就绪。

## Success Criteria

1. 每个 Gate selection 的 eligible Check IDs 与传给 `checkAggregation.mode = "all"` 的 IDs 完全相同；任何 eligible failed 或 unavailable status 均按 aggregate policy影响 initial Gate result/exit，findings/messages/Records 从不参与 aggregation。
2. 四项 repository-quality Check 直接运行且具有明确 producing-Check finding policy；默认 blocking 保持兼容，Gate 的暂缓 quality findings 以 non-blocking passed Check、完整 final data/Records 和 actionable warning 表达，scanner/source/parse unavailable 保持 unavailable。
3. `markdownLinkValidation` 对外暴露、验证并文档化 `findingPolicy`；blocking/non-blocking、Records、warning、unavailable 与 all-Gate aggregation 都有最窄行为证据。
4. Gate quality tests 不扫描当前仓库、不共享/混杂 output，且其 artifact 只在 test-owned directory 创建和清理；真实 Gate evidence 与 fixture proof 的边界可区分。
5. Gate output 的 aggregate policy、eligible statuses、elapsed stage、只在 diagnostic/machine output 启用时捕获并在两项均启用时共享的 run timestamp、terminal log 与 docs link validator 名称都有无歧义的 owner 文档和针对性测试；不恢复 nested Run、quality-only report、独立 quality command 或 Record-based reducer。
6. 将用户原始 27/129/2 初始快照、最终 28/134/2 Gate evidence 及其数量变化完整记录，并把公开发布前届时全部已知 findings 的处置条件交接给独立 active/unaligned release-quality Decision；本 Change 不以实际修复、waiver 或 release evidence 作为完成条件。
7. Gate 对 schema/example materials 的临时读写竞争只由三个确有资源关系的 Checks 通过 named mutex 串行；其余 docs Checks 保持可并行，且该边界有 Definition 与 Case evidence。
7. 相关最窄测试、Test Evidence、docs/Decision/Change checks 以及 required/full Gate 在实施后通过；在此之前 active Change 与 unaligned Decisions 保留未完成任务。

## Affected Owners

- `docs/quality-metrics.md`、`docs/api-mechanics.md`、`docs/architecture.md`：Check status、finding policy、explicit aggregation 与 Record/message 边界。
- `docs/configuration.md`、Markdown Link guide/declarations/examples：`markdownLinkValidation.findingPolicy` 的 public contract。
- `docs/script-tooling.md`、`scripts/project/gate/**`：Gate definition、eligibility/controls、output/log/performance semantics 与 root entry。
- `docs/testing/cases/{quality-gate,repository-tooling,warning-generation,scan-configuration}.md`：测试、fixture、artifact ownership 与语义证明。
- `docs/decisions/`：本轮 Gate 聚合、Markdown finding policy、invocation timestamp、phase timing 与公开发布前质量处置 Decisions；`decision-index.json` 是派生索引，不是独立内容 owner。
