# Tasks

按设计审计、独立模块、共享入口串行集成和 owner 验证推进；任务勾选记录 Plan 内进度，计时与组合 Gate 由主线程统筹。本轮 Git 提交已获授权，受限自动推送遵循[工作区提交规则](../../docs/tooling/workspace.md#local-post-commit-auto-push)，结项删除另行授权。

## Readiness

- [x] 0.1 核对 Scheduler/Definition/Run/package-tools owner 与相关 active Decisions，恢复 full compatibility、shared identity、diagnostics 和 measurement 生命周期约束。
- [x] 0.2 收敛 function-or-descriptor、phase union、helper、runtime fingerprint 排除、never storage erasure 与 ShellAdmissionFacts 单一 owner；引用 261013-declare-scheduler-context-demand。
- [x] 0.3 完成独立及真实 Context/defineAdmissionPolicy/direct Definition 建议接线的 strict tsgo probe，记录范围与失败模型；不冒充 Product 或 installed declaration 验收。
- [x] 0.4 root 审计 proposal/design/tasks 的 Outcome、Intended Change 与 Resulting Impacts，并运行公开 plan 入口；已进入 Plan。
- [x] 0.5 prepared-facts 代理冻结共享入口后读取实际 diff/interface，确认 PreparedTaskGraph/PreparedCheckExecution 与动态需求独立；root 分配共享文件串行写入时点。

## Implementation

- [x] 1.1 增加 phase-specific public callback consumer types 与 defineSchedulerContextCallback；legacy function 推导不变，descriptor 以 never 安全存储，helper 保留 tuple/Pick 和实际 result 类型；保留 exact prepared returned keys。
- [x] 1.2 接入 Definition 与 prepared-result closed grammar/normalization，校验 phase needs 与 callback，copy/dedupe/freeze needs；仅在验证过的私有边界恢复已知需求的 callable，不宽 cast 绕过检查；保持 failure taxonomy 与 fingerprint。
- [x] 1.3 建立 invocation-local phase union/依赖闭包及共享 context builder；固定 diagnostics 私有要求不可由声明削减，在线 measurement 保持 flush/captured prefix。
- [x] 1.4 重接 static/no-observer 薄查询与 custom subset decision projection，跳过未请求 full inspection、历史 DTO、blocker/candidate observation；保留全候选 query、legality guards 和 tie/order。
- [x] 1.5 分离 sealed terminal handoff 与 raw collector；none/graph/execution/raw/legacy/mixed participants 共用 phase context，generic 顺序与 prepared 最后不变，取消/policy-fault drain 和早期 not-run 不变。
- [x] 1.6 execution owner 可选 ShellAdmissionFacts 仅记录成功 start 的 first-admission order；collector 删除同义 admitted Set并消费该 source，terminal settled 使用已有 settlement facts，timing/cumulative 其它责任仍由 collector 拥有。
- [x] 1.7 按已冻结 prepared-facts 入口串行集成 Invocation/Check/Scheduler/public export/Definition 文件，核对无关工作不被覆盖；需求与 flags/preAdmission 动态 seed 不混同。
- [x] 1.8 按测试策略及 test-evidence-review 补齐 grammar/type/decision/terminal/measurement/operation-count 证据与 Case 维护；不以重复测试填数。
- [x] 1.9 更新稳定 owners、公开指南/JSDoc、legacy 和 opt-in 示例、API inventory、package declarations 相关材料，明确 runtime grammar 与 TS typed helper 区别；不新增 subpath/依赖/CLI。
- [x] 1.10 按首轮 Gate Findings 收窄 workbench 私有 function-valued fixture contract（satisfies 公共 conformance），提取 learned strategy 类型契约与 Scheduler observation setup 真实 owner；不增公开 root names/normalize API，不改选择、阈值、waiver 或压缩格式。

## Verification

- [x] 2.1 运行相关最窄 owner 测试，覆盖 closed grammar/snapshot、legacy full、tuple/exactness、none/phase union/shared identity、不同 boundary detached、完整 diagnostics。
- [x] 2.2 验证 static 无全 inspection、opt-in candidates/runtime 无历史投影或在线 collector、terminal none/graph/execution 无 raw 采集；mixed legacy/raw 和 diagnostics 保持完整生产，不仅检查字段缺失。
- [x] 2.3 验证 terminal legacy/no-demand/mixed-none/graph/execution/raw、取消/policy-fault drain、prepared 最后、失败继续及输出 priority，核对 preAdmission/blocked/pending-cancel 不进入 admission source。
- [x] 2.4 验证 measurement captured prefix/post-action、guard/tie/scope traces、immutable AdmissionState 与 raw standalone/ prepared scheduler 入口行为，不改变 selection algorithm。
- [x] 2.5 按导航执行受影响 source typecheck/lint/dependency 与 package candidate installed consumer/declarations/示例验收；root 安排跨 owner 更广 Gate，记录实际命令/未覆盖边界。
- [x] 2.6 由 root 安排独占窗口，完成 public Run before/candidate 正式 benchmark；保留 N/shape/P、绝对耗时/小图代价/噪声；不要求每 case 更快，不设经验阈值，不引用旧 profile 当当前结果。
- [x] 2.7 检查局部 diff/文档/Case/API inventory 闭合，主线程审计 Decision alignment 与 Change 交付；提交与 finalize/delete 分别按授权执行。

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

- 最终 `mise exec -- bun run check -- --all` exit 0，43/43 Checks 通过，包含 Product/scripts tests、
  typecheck/lint/import boundary、API/examples、实际安装包 artifact/types/documentation/runtime acceptance。
  候选 `0.0.0-local.3db8a33d20ab`；完整日志位于
  `.log/project-gate/2026-10-13T06-24-59.203Z-2372756-26315e2b-165e-4c58-b346-5ff52251c19c/`。
- 总反馈 75.99 秒低于 90 秒预算；Check 均值 3029.5 ms、P95 7478.1 ms 超过 2000/5000 ms 告警预算，
  未提高阈值或增加 waiver。Gate 成功不表示已解决这些性能告警。
- Case 闭合为 715 entities / 178 Cases / 15 topics；稳定 owners、公开指南、API inventory、示例投影已同步。
  完整需求声明方向经源码、独立审查和安装包验收核对，Decision `261013-declare-scheduler-context-demand`
  已由 root 用公开 CLI 标记 aligned。Plan 保留，未暂存、提交或结项删除。
- 独立 reviewer 发现的 tuple-union 类型 P1 已修复并保留 source/consumer negative regression。
  首轮 Gate 为 40/43；随后修复私有 workbench contract，并按真实职责提取 learned 类型与 observation setup。
  reviewer 定向复核 42 tests/10 files 和 strict types 通过；AST 确认移动的有序语句、loop、guards 和 learned body 不变。
- 最终操作证据 `tmp/optimization-wave-20261013/scheduler-needs-bench/operation-counts.final.ndjson`
  为 16 行、仅 wide-independent N=8/P=8；证明未请求投影和 collector 没有生产，diagnostics 保持完整。
- 最终独占采样 UTC 06:17:30–06:19:50，exit 0：738 source / 40 owner / before / harness hashes 前后不变，
  160 batches / 1,920 timed / 480 warm / 20 cells 全部闭合。root 与独立分析统计一致。
  最终表见 [性能证据](performance-evidence.md)，原冻结结果独立保留，未混合样本或覆盖 raw。
  N8 static pooled +22.93%（+0.839 ms，paired -4.08%，2/4 wins）与 N128 diagnostics +3.33%
  （+4.249 ms）等不利结果保留，未进行第三次择优重测。
- 跨平台、真实 I/O/深依赖/资源竞争 workload、heap/GC 与独立 cold candidate lifecycle integration 未运行；
  本次没有修改 candidate lifecycle。临时 source 镜像、harness、raw 与复核材料留在本轮 tmp 目录供审计，
  不进入 Product；保留原因与后续清理边界见各目录 artifact-note。
