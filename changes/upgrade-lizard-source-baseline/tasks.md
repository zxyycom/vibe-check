# Tasks

先冻结来源和原始 oracle，再翻译与必要偏差，最后验收公开结果、包和成本。

## Readiness

- [x] 0.1 已核对 Outcome、七模块/保持范围及公开、私有、来源、包 owner；直接依据见设计与准备度调查。
- [x] 0.2 已从精确本地源码确认 Rust 增量位置、Kotlin 行/NLOC 污染机制与 regex 路线，固定采用 1.24.1，无待选产品策略。
- [x] 0.3 已区分原始 oracle/必要偏差、升级/独立修复；默认顺序、共享 owner 与首个实施任务明确。
- [x] 0.4 已完成非实施代理的独立准备度审计：范围、路线及必要影响可直接推进，无未决阻断。

## Implementation

- [x] 1.1 在选定基线冻结源码身份、exact corpus 和当前公开 Check/包输出；重建固定 1.24.1 原始 oracle，保留 14 项及两项既有 TS 缺陷对照。
- [x] 1.2 按七模块映射忠实翻译，保留 regex/template 优先级、Python whitespace、tokenFactory 与 streaming/扩展生命周期。
- [x] 1.3 在 Rust 实际 addCondition 增量处补真实 =>/line tags，保持首 arm/非 match 不计、无扩展不采集和普通贡献顺序。
- [x] 1.4 在 Kotlin-local expression/when 生命周期维护正文位置/NLOC 快照并正确重放 ender；保留全局 counters 和其他 reader。
- [x] 1.5 维护新版 provenance/identity、headers/ranges/hashes、fixture/evidence 路径、NOTICE/advisory；更新实际 package/Gate/测试/benchmark 旧引用，经 source-mapping sync 派生 pin，不改历史调查。
- [x] 1.6 按行为 owner 更新直接测试与 Case，原始新版 oracle/修正期望分离；依据实际影响同步公开指南、内部 owner 与 changelog。

## Verification

- [x] 2.1 运行最窄 analyzer/shared regex/readers/extension/source-identity 测试，再覆盖整个 function-metrics；证明 14 项、27-reader/55-suffix、malformed 及 pair/no-extension 生命周期。
- [x] 2.2 按 Rust/Kotlin 矩阵断言真实 token/line、CCN 及位置/NLOC；原始 oracle 保真、获批偏差独立通过，两项 TS 缺陷不伪报为升级已修复。
- [x] 2.3 通过 adapter→真实 Worker→公开 Check 的字段、完整 contributors、strict limits、blocking/waiver/unused 直接验收。
- [x] 2.4 运行 source-mapping 只读审计、typecheck/lint、validate、test-evidence、decisions check、change-plan check 和 git diff --check。
- [x] 2.5 以冻结同一真实 corpus 对照升级前后完整 Check 成本及已解释输出变化，保存样本/runtime/temperature；可重复退化定位闭合，不外推 Gate 加速比。
- [x] 2.6 经公共 package 入口验收 exact artifact 与 installed Node consumer 的 Worker/来源/法律材料，再运行 `mise exec -- bun run check -- --all`；独立审查 owner/兼容说明和最终 diff。

## 最终验收与待结项

- 七模块、Rust/Kotlin 有界偏差、来源/包/Case 与 owner 已闭合；107 项 function-metrics/advisory、真实 Worker/public Run 及原始/修正分离证据通过。核心与必要 catalog 整改经独立正确性、coding-style/无多余抽象审查，不改 quality 限值或 waiver。
- 同一 597-file 冻结 corpus、两 temperature 各 15-block ABBA 已完成，src/corpus 稳定、各侧 facts 逐样本稳定。warm median +2.11% / paired mean +51.90ms 作为已解释并接受的采用成本保留；cold CI 跨零，不宣称无性能退化或 Gate 加速。
- exact local candidate `0.0.0-local.fa733ec0cf8d` 为 current；Node 24.18.0 下 artifact/installed Worker/types/docs 验收及完整 Gate **43/43 passed、exit 0**。已建立的[实施调查](../../docs/investigations/verify-lizard-1-24-1-implementation.md)保存最终证据、前两轮 42/43、typecheck 阶段误报更正及 28 项持久资源；后续不依赖本 Change 目录恢复这些认识。
- 全部 16 项任务完成；Git 提交与 Change finalize 待执行。本轮是 local candidate 验收，不代表正式发布或其它环境已生效。
