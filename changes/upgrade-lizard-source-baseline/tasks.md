# Tasks

先冻结来源和原始 oracle，再翻译与必要偏差，最后验收公开结果、包和成本。

## Readiness

- [x] 0.1 已核对 Outcome、七模块/保持范围及公开、私有、来源、包 owner；直接依据见设计与准备度调查。
- [x] 0.2 已从精确本地源码确认 Rust 增量位置、Kotlin 行/NLOC 污染机制与 regex 路线，固定采用 1.24.1，无待选产品策略。
- [x] 0.3 已区分原始 oracle/必要偏差、升级/独立修复；默认顺序、共享 owner 与首个实施任务明确。
- [x] 0.4 已完成非实施代理的独立准备度审计：范围、路线及必要影响可直接推进，无未决阻断。

## Implementation

- [ ] 1.1 在选定基线冻结源码身份、exact corpus 和当前公开 Check/包输出；重建固定 1.24.1 原始 oracle，保留 14 项及两项既有 TS 缺陷对照。
- [ ] 1.2 按七模块映射忠实翻译，保留 regex/template 优先级、Python whitespace、tokenFactory 与 streaming/扩展生命周期。
- [ ] 1.3 在 Rust 实际 addCondition 增量处补真实 =>/line tags，保持首 arm/非 match 不计、无扩展不采集和普通贡献顺序。
- [ ] 1.4 在 Kotlin-local expression/when 生命周期维护正文位置/NLOC 快照并正确重放 ender；保留全局 counters 和其他 reader。
- [ ] 1.5 维护新版 provenance/identity、headers/ranges/hashes、fixture/evidence 路径、NOTICE/advisory；更新实际 package/Gate/测试/benchmark 旧引用，经 source-mapping sync 派生 pin，不改历史调查。
- [ ] 1.6 按行为 owner 更新直接测试与 Case，原始新版 oracle/修正期望分离；依据实际影响同步公开指南、内部 owner 与 changelog。

## Verification

- [ ] 2.1 运行最窄 analyzer/shared regex/readers/extension/source-identity 测试，再覆盖整个 function-metrics；证明 14 项、27-reader/55-suffix、malformed 及 pair/no-extension 生命周期。
- [ ] 2.2 按 Rust/Kotlin 矩阵断言真实 token/line、CCN 及位置/NLOC；原始 oracle 保真、获批偏差独立通过，两项 TS 缺陷不伪报为升级已修复。
- [ ] 2.3 通过 adapter→真实 Worker→公开 Check 的字段、完整 contributors、strict limits、blocking/waiver/unused 直接验收。
- [ ] 2.4 运行 source-mapping 只读审计、typecheck/lint、validate、test-evidence、decisions check、change-plan check 和 git diff --check。
- [ ] 2.5 以冻结同一真实 corpus 对照升级前后完整 Check 成本及已解释输出变化，保存样本/runtime/temperature；可重复退化定位闭合，不外推 Gate 加速比。
- [ ] 2.6 经公共 package 入口验收 exact artifact 与 installed Node consumer 的 Worker/来源/法律材料，再运行 `mise exec -- bun run check -- --all`；独立审查 owner/兼容说明和最终 diff。
