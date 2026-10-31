# Tasks

先统一范围，再接线局部扫描，最后用独立证据和 owner 审查验收。

## Readiness

- [x] 0.1 核对 main、干净工作区、现行 Gate/质量/测试 owner、相关决策及活动 Change，确定边界。

## Implementation

- [x] 1.1 建立共享领域范围并让测试 owner 路径、变更规则和完整指标配置引用。
- [x] 1.2 接线 scoped 指标实际文件交集、指标选择和默认基础文档检查，保留完整模式及比较边界。
- [x] 1.3 同步内部 owner、导航、Case 和必要入口说明。

## Verification

- [x] 2.1 用目标测试证明单/多范围、排除与转义、非 scoped 完整覆盖、选择和绑定。
- [x] 2.2 执行类型/lint、Case 完整性、相关文档检查和代表性 Gate，记录实际范围及限制。
- [x] 2.3 独立代理按实际 diff 反查实现与文档，处理发现并交付；不擅自提交或删除 Change。

## Evidence

- 范围/组装/原 area 行为由 scoped-metrics、Definition 与 eligibility 测试证明；真实 scanner 检出所选 Product 领域间的重复而排除未选领域。
- 最终 scoped Gate：`bun run check -- --scope project-tests --scope product-markdown-tests`，14 passed / 0 failed；包括 Gate 56 + selection 7 个测试及 Markdown 62 个测试。证据目录 `.log/project-gate/2026-10-31T07-45-29.162Z-2518212-45704ba3-7347-4092-a152-01077857274f/`。
- 最终默认 Gate：`bun run check`，9 passed / 0 failed，标准 fast 性能政策通过；证据目录 `.log/project-gate/2026-10-31T07-45-37.218Z-2519355-eed3ddf4-cd43-40d7-8a9a-6dc22c230395/`。这不是冷态性能基线或完整验收。
- `bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run test-evidence -- check --root .` 均通过；完整账本 796 entities / 193 Cases / 17 topics。
- `bun run validate -- materials`、后续 `materials links`（638 Markdown）、Decision check、Change collection check 和局部 diff whitespace 通过。
- 非实施代理最终复核四个目标测试文件（20 pass / 0 fail）、相关 Case 与实现/owner diff，无剩余阻断。Product API 未变，无需更新随包指南。
- 首轮 import-boundary、复杂度和一次新测试 no-shadow 失败均有明确修复；未提高预算或阈值，未修改原排除策略。局部 file-metrics 会保留范围外 waiver 的未命中 audit warning，不影响通过，不据此删除既有 waiver。
- 实施交付阶段未执行 changed/all 或发布验收，未把局部通过外推为全仓通过；用户后续授权的完整扫描见下节。仍未授权 finalize/delete，保留已完成 Plan。

## Commit and Full Scan

- 用户后续授权提交本任务改动并全面扫描；提交范围仅含本 Change 的实现、测试、owner/导航/AGENTS 规则与完整计划，不纳入其它活动 Change。
- `bun run check -- --all`：41 routine Checks passed、0 failed、2 explicit/release-only 未选。真实 package artifact、installed docs/runtime、全部 routine 测试、类型/lint、重复/文件/函数指标、材料及治理检查均执行。
- 最终 Gate 仍 failed / exit 1：mean 3920.4ms > 2000ms、P95 11649.1ms > 5000ms；总反馈 62693.8ms 在 90000ms 预算内。最慢为 Gate tooling 20555.0ms、installed runtime 13826.3ms、Markdown tests 11649.1ms。证据目录 `.log/project-gate/2026-10-31T07-53-12.636Z-2536409-31e968d9-e9a0-456f-bf02-10430f161c57/`。
- 全仓指标只有两项既有精确豁免 Finding：building-project-gate 教程 560/500 code-lines、Gate manifest 函数 201/150 code-lines；无未豁免 blocking Finding。不改阈值或删除 waiver 以制造通过。
- 性能超预算是否由本次引入尚未做基线对照，不能称为既有问题或声称已定位根因；本轮记录问题，不自动扩展成全仓性能优化或重跑刷绿。
- `bun run check -- --consumer-types --admission-workbench`：4 Checks passed / 0 failed，补齐 routine all 刻意未选的 installed types 与 workbench；证据目录 `.log/project-gate/2026-10-31T07-55-02.563Z-2553357-d99462f0-f030-4aa4-be89-56b72544cc3e/`。这不是正式 release receipt 验收。
