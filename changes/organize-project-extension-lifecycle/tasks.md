# Tasks

按已审计的契约先完成直接命名与内部边界切换，再同步 Project Gate、文档和消费者，最后以语义复核与完整项目门禁退出。

## Readiness

- [x] 0.1 从根导出、Definition closed grammar、默认 Checks、Scheduler/Run/Gate 编排、辅助回调和测试 seam 反向核对函数清单，并在 `lifecycle-inventory.md` 为每项记录逻辑位置、当前消费者、最终去向与 owner。
- [x] 0.2 固定逻辑位置不等于实际槽位的两层模型，明确内部 collector、公开 effects、prepared strategy、invocation barrier 与逐 Check transition 的独立上下文、依赖和执行顺序。
- [x] 0.3 固定 Check、Scheduler、Run output 与 Gate contributor 的最终名称、API/内部接线、同步/异步、调用次数、取消、失败、输出、fingerprint 和无兼容直接切换契约。
- [x] 0.4 核对相邻 Change 与稳定 owner，明确 Project change facts、Project file inputs、有效图 admission、配置组合及所有无当前消费者的位置不由本 Change 实现或预建路径。
- [x] 0.5 修订冲突的长期 Decision 并闭合后继关系；确认 proposal、design、inventory 无暂定方案或阻塞开放问题，能够由实施者直接推进。

## Implementation

- [ ] 1.1 在首次修改测试前运行 `bun run test-evidence -- check --root .` 保存当前 Case 基线；后续 test rename/split/merge 保持语义 Case 的 Owner / Proves 与独立证明价值。
- [ ] 1.2 将 Check `preflight` / `execution` 全量切换为 `prepare` / `execute`：更新公开类型与根导出、closed validation、check tree/materialization/normalization、preparation/execute runtime 命名、诊断与 reason vocabulary、package Checks、Project Gate Checks、tests/support 和 fingerprint exclusion；增加旧字段与旧导出的负向证据。
- [ ] 1.3 将 `flagControlCompleted` 从 `CheckExecutionLifecycle` 拆为 `InvocationLifecycle.selectionSettled`，让 resolved execution 与 progress rendering 分别接收 invocation/check lifecycle，并以原调用位置保持 selection、started、settled 与并发顺序。
- [ ] 1.4 将 Scheduler `measurementHooks`、`SchedulerMeasurementHook`、prepared `complete` 和 Run `outputs.measurementHooks` 全量切换到 `terminalEffects`、`SchedulerTerminalEffect`、prepared `terminalEffect` 和 `outputs.terminalEffects`；同步 provider、engine、internal summary runner、learned strategy、diagnostic/event、result priority、exports 与 tests，并保留 sealed measurement payload 和调用顺序。
- [ ] 1.5 将 Gate `afterGate` full-result transform 收窄为 `PROJECT_GATE_RUN_CONFIG.resultContributor`：建立 message-list contribution context/type/parser，迁移 central definition、bound module、root adapter 与 performance contributor，删除旧 export，并覆盖 status preservation、message append、throw/invalid/hostile fail-closed 和 exit/transcript 行为。
- [ ] 1.6 迁移 machine example、package API material、external consumer fixture、仓库脚本和所有其他已安装调用方；用路径限定搜索确认只有历史 Decision/Change 现状说明仍可出现旧名，运行时代码、当前示例和测试输入无兼容残留。
- [ ] 1.7 按 design 的固定结构重写 `docs/guides/callbacks.md`，同步 `docs/api-mechanics.md`、Project Definition/Run/Scheduler/Human Output、Project Gate、README、navigation、package document mapping 与 changelog；逻辑保留项不得出现候选路径或签名。
- [ ] 1.8 将本 Plan 的未对齐 Decision 与实际实现逐条核对；完整方向已成为当前事实时才标为 aligned，并同步 Decision index。

## Verification

- [ ] 2.1 运行最窄 Check authoring/preparation/execution、fingerprint、internal lifecycle/progress、Scheduler terminal delivery/prepared lifecycle/output priority 与 Gate result contribution/bound-run/root-run 测试，并记录所有命令与结果。
- [ ] 2.2 运行 `bun run test-evidence -- check --root .`、`bun run typecheck`、`bun run lint`、`bun run docs:api` 与 `bun run validate`，修复所有 Case、类型、lint、API material、文档结构/链接/schema/example 失败。
- [ ] 2.3 运行 package build/candidate external-consumer acceptance，证明根导出、安装后 TypeScript authoring、运行时 closed grammar、随包文档和直接切换行为均来自 exact candidate，而非工作区源码旁路。
- [ ] 2.4 由未参与实现的代理基于实际 diff 反查用户说明与内部设计 owner，记录已同步路径、无需修改路径及理由，并处理其行为/责任边界发现。
- [ ] 2.5 运行 `bun run decisions -- check`、`bun run change-plan -- check changes/organize-project-extension-lifecycle` 与 `bun run check`；复核局部 diff 只包含本 Change，并确认 Success Criteria 全部有直接证据后再请求完成/删除授权。
