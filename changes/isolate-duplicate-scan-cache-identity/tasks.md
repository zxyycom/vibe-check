# Tasks

先冻结边界和对照输入，再分离私有模型，最终以直接行为、操作量和独占端到端计时交付。

## Readiness

- [x] 0.1 读取公开 Duplicate 与内部 Project files/scanner owners，确认 exact/fragment/area/settlement、cache v3/config version 4 与默认启用不变量；起点全树 Case check 704/704 通过。
- [x] 0.2 收敛 scan input 与 cache owner prepared identity 的模型、availability→identity→lookup→scan→write 顺序；保持 identity preparation 抛错的 source-unavailable 映射。
- [x] 0.3 准备同 public API 双 source 镜像、冻结 workload/protocol、运行 smoke，向协调者报告 ready 后等待正式 timing 独占窗口。

## Implementation

- [x] 1.1 ExactInputSet 只携带 root、approved paths 与 area policy；cache owner 仅在 availability 成功且 cache enabled 后采样完整 identity，scan 前准备一次供 lookup/write。
- [x] 1.2 保留扫描验证、exact acceptance、fragment/area/policy 与失败结算；纯 cache identity builder 改为显式 commit/fingerprint 输入，cache 格式和版本保持。
- [x] 1.3 扩充既有直接 callback/cache identity entity，证明非消费路径跳过 cache-only 操作、cache-on 命中与 identity 失效、scan 前采样及失败语义；需要 Case 变化时先与协调者确认唯一写入范围。
- [x] 1.4 向协调者交付 Project files/scanner dependencies 的定向职责说明更新，由协调者落实共享 owner 文档。

## Verification

- [x] 2.1 运行最窄 Duplicate tests 与 Product typecheck/lint、Case 全树闭合，检查局部 diff。
- [x] 2.2 在协调者批准独占窗口后用冻结 public API workload 对比 before/after，分别报告 cache-off/cache-hit/cache-miss/no-eligible/unavailable、操作减少与端到端 timing 的边界。2026-10-13 04:53:47–04:55:13 UTC 独占完成 200 正式样本与 20 warmup；原始结果、protocol、source manifest 位于 `tmp/optimization-wave-20261013/duplicate-identity/`，root 已重验源/harness hashes、状态/reason/Records 与 summary。
- [x] 2.3 非实施代理审查实际 diff 与文档影响，协调者运行组合 Gate；交接证据、未覆盖风险和辅助物保留去向，不结项删除。

## Delivery Evidence

### 文档与编码规范整理后验收

本次实际 diff 已按 ai-ready-docs 与编码规范完成实施侧检查及独立复核，无剩余必须整改项或临时风格豁免。
整理后的候选 `0.0.0-local.f051c973f74b` 经 `mise exec -- bun run check -- --all` 验证，exit 0，
43/43 Checks 通过，包含实际安装包的 artifact/types/documentation/runtime acceptance。
日志为 `.log/project-gate/2026-10-13T07-03-21.944Z-2398670-75eec21d-3d31-41b0-8640-0d9ed675fca7/`。
总反馈 41.54 秒；Check 均值 2277.1 ms、P95 6029.8 ms 仍超过 2000/5000 ms 告警预算。
首轮同候选 Gate 有三个 5 秒测试超时；原日志保留在
`.log/project-gate/2026-10-13T07-01-30.440Z-2391490-e2233747-1008-4d86-9df8-cba0c66fb8c8/`。
三个目标文件单独复跑 9/9 通过后，未改源码、超时、阈值或豁免即完成上述完整重验。
Case 闭合保持 715 entities / 178 Cases / 15 topics；文档投影、材料、Decision、Change 和格式检查通过。
整理后未重新计时：下方性能数据只证明各自冻结源码，不视为当前字节版本的测量。Plan 继续保留。

### 上轮实现验收

以下保存上轮实现验收的日志、候选版本与测量边界；当时的 Git 状态不代表本次提交结果。

非实施代理复算原始样本与 summary、复跑 Duplicate 18/18 并审阅实际源码及 owner 文档，无阻断。
2026-10-13 最终 `mise exec -- bun run check -- --all` exit 0，43/43 Checks 通过，包含 Duplicate、
types/lint/import boundary、Case 及真实安装包的 artifact/types/documentation/runtime acceptance。
候选 `0.0.0-local.3db8a33d20ab`；日志位于
`.log/project-gate/2026-10-13T06-24-59.203Z-2372756-26315e2b-165e-4c58-b346-5ff52251c19c/`。

总反馈 75.99 秒在 90 秒预算内；Check 均值/P95 为 3029.5/7478.1 ms，超过 2000/5000 ms 告警预算，
未修改预算。受控 scanner 计时不外推为真实 jscpd 或 Gate 的性能收益；跨平台和独立 cold candidate
lifecycle integration 未运行。原始数据、source 镜像与辅助缓存继续留在本轮 tmp 目录供审计，不进入 Product。
Plan 保留，未暂存、提交、远端写入或结项删除。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
