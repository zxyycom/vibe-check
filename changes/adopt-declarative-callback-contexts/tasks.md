# Tasks

按契约接线、按需生产、消费者迁移、独立验收的顺序完成本 Change，再交接 Scheduler 底层重构。勾选项仅代表其指定证据已成立。

## Readiness

- [x] 0.1 核对 package root、Check/Scheduler/command 公开类型与调用入口；完成 [callback 覆盖、业务输入分型和采集边界](callback-surfaces.md)，包含 learned observers 与纯工具 callbacks 的范围判断。
- [x] 0.2 将已确认的业务输入独立、自动 context 推导、默认空、静态需求、精确视图与一次 breaking 切换落实到 [Design](design.md)；恢复现有 helper 的 literal/宽化/union 正反例，未将新跨扩展点接线误记为已实现。
- [x] 0.3 核对领域 owner、现行需求/summary/terminal/在线观察 Decision 与 immutable-state 边界，明确新形状的演进清单、保留语义及独立于 Scheduler 重构的交付出口。
- [x] 0.4 由非实施代理从实际 diff 复核目标重心、完整性、负向与历史描述、Markdown、入口及验证可执行性；修复阻断意见并确认 Plan 可直接推进。

## Implementation

- [ ] 1.1 按 [契约交接](design.md#契约交接与迁移)复核并演进相关 Decision：默认需求/identity/DTO 分组改动有后继，顺序、失败、prefix 与事实源含义完整承接；同步作为下一步实现依据的 owner 目标。
- [ ] 1.2 实现共同 descriptor 类型、closed snapshot 和 `defineContextCallback`；以 Check prepare/execute、Scheduler 各阶段和 command 两阶段原型验证字段自动推导、业务 input/结果保留、prepared options 与 typed data/handoff；保持宽化/union 的健全结果。
- [ ] 1.3 接入 Definition 与 prepared-result validation，固定各阶段需求及非法输入映射；实现精确 own-field 投影、冻结空 context、旧 snapshot 稳定与 runtime 配置/fingerprint 分离。
- [ ] 1.4 改造 Check preparation/execution：options 独立传入，按需求建立 project/dependencies/reporter/artifact projection；保留取消、console、Record close、settlement、handoff 与输出授权。
- [ ] 1.5 改造 Scheduler preparation/decision/terminal：启动前固定生产配置，按新字段拆分累计、history、Run 与逐 Task 采集/物化；共享 clock/validity 和真实事实，维持原统计定义、采样/累加语义与 terminal 顺序/失败规则。
- [ ] 1.6 改造 command callbacks 与全部随包 Check；command 在 constructor 汇总自身和下游需求，分别投影；迁移 learned prepare/decide/recording，保持 identity/observe、history model 和 static fallback 语义。
- [ ] 1.7 迁移仓库实际 Product consumers、测试/support、workbench/development、当前可执行 examples、typed/JS package fixtures 与 root API inventory；按实际依赖处理仍参与验证的历史资源代码。
- [ ] 1.8 同步公开/内部 owner、JSDoc、受管示例与升级说明：签名、默认空、统计分组、helper/直接调用、terminal identity 和旧包/匹配调用方恢复步骤；实现只保留新契约，发布版本留给发布流程。
- [ ] 1.9 按测试策略与 `test-evidence-review` 完成受影响 Case/实体维护；测试目的以新稳定 owner 的可观察承诺为准，不通过空 Case 或删除断言掩盖迁移缺口。

## Verification

- [ ] 2.1 类型：最小/空需求、未声明字段、跨阶段 key、原始 descriptor、异步非法 decision、literal/宽化/union、业务/返回类型、typed provider 与直接调用均有正反例；运行 `bun run typecheck -- product` 和受影响 scripts typecheck。
- [ ] 2.2 运行时：各注入位置覆盖零需求、最小需求、混合消费者、非法声明、声明后变更与 prepared 返回；断言 own keys、descriptor/data shape 与无额外字段，验证 context 精确性独立于 TypeScript。
- [ ] 2.3 生产：以 probes/counts 分别证明无需求、单字段组、组合需求及 diagnostics；无未请求 DTO、reporter/facade、history 或 task table 维护；没有“先 full 再裁剪”或留待后续 Change 的接线。
- [ ] 2.4 语义：scripted clock 与受控 Task 证明 timing 分组、有效零区间、不可用分支、interval 归属与旧 prefix；验证取消/drain/seal、terminal none 交付、顺序/失败优先级、direct dependencies/handoff、artifact 授权与 late Record rejection。
- [ ] 2.5 迁移：实际安装包 TS/JS consumer 证明新 helper、Check/command/prepared/terminal 用法；逐项核对升级表、旧隐式读取、具体 callable 返回类型与受管示例，确认当前所有 consumers 使用新契约。
- [ ] 2.6 运行受影响最窄 tests、`bun run lint`、`bun run validate`、`bun run test-evidence -- check --root .`、`bun run decisions -- check` 和 `bun run change-plan -- check changes/adopt-declarative-callback-contexts`；最后运行 `bun run check -- --all` 覆盖跨 owner、package artifact 与 external consumer。
- [ ] 2.7 非实施代理基于实际代码/文档 diff 反查行为、稳定 owner、Case、迁移与按需证据；关闭阻断项，核对成功标准及 Decision alignment，记录实际命令、结果和未覆盖边界后交接下一 Change。
