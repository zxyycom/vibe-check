# Design

本设计以“一个输出 owner 一个具名 channel 或 namespace”为共同规则，以统一 invocation path context 提供唯一解析入口，再按事实所有权拆分混合日志并减少跨 channel 的无价值重复。

## Context

- `CheckExecutionContext` 当前包含 `dependencies`、prepared `options`、`project`、`records` 与 `signal`；`project` 只有绝对 root 和 canonical flags。
- invocation creation 已在任何 Check work 前确定 invocation ID、effective outputs、absolute project root 与 diagnostic log target；machine directory 当前在 completion 再从 effective configuration 解析。
- Repository Gate 在 Product 外创建 invocation directory。Product diagnostic 和 machine publication 通过 RunControls output overrides 获取它；process Checks 与 test-evidence rule-test Check 则通过 Definition closure 单独获取同一路径。
- `gate.log` 通过 patch 全局 console 与 process streams 保存整段终端 transcript，因此混合 Gate adapter、Product progress、Check messages 和 `afterGate` presentation。
- Product diagnostic logger 是 Core、Scheduler、learned admission 与 Check lifecycle 的共同 sink。2026-09-04 的 required sample（candidate `0.0.0-local.6229ebd2ba50`）含 269 个 events；其中 63 个 `scheduler.decision` 占 1,254,938 bytes，64 个 `record.reported` 占 55,454 bytes，36 个 `check.finished` 占 14,505 bytes。
- 每个 Scheduler decision 当前携带 immutable full graph identity；active Decision 要求每条 decision 自包含该证据。拆分并去重必须演进该 Decision，使 owner channel 自包含，而不是继续要求每个 event 单独自包含。
- machine v4 以 `run.json` 与 `records.ndjson` 组成 canonical atomic set。它们属于一个 publisher owner，但有两个不可随意合并的逻辑 artifact。
- Check persistent cache、Gate learned history、package candidate state 和 per-invocation evidence 生命周期不同。Markdown Link cache 能力已实现但当前 Gate 未启用；duplicate-detection cache 与 scheduler history 当前启用。

## Goals / Non-Goals

**Goals**

- 让 Product、Gate 和每个 executable Check 读取同一次解析形成的 absolute path facts，不再由 Definition closure 或各 output phase 重复解析同一路径。
- 让每个输出 owner 具有可从名称直接识别的 channel 或 namespace，并让 failure/readback 仍能归因到具体 owner。
- 将 Gate、progress、Core、Scheduler、learned admission、machine 和 Check artifact 分开，同时保留所有 artifacts 的 invocation identity，以及 Product diagnostic channels 之间的全局顺序和 monotonic elapsed。
- 删除由其它 canonical owner 完整保存、且在当前 diagnostic 中没有独立过程价值的 payload 重复；保留诊断失败、因果顺序和定位完整事实所需的信息。
- 让全部 Check duration 作为完整 Run summary 呈现，包括未执行 Check 的 `null`，不计算“最慢 Top N”。

**Non-Goals**

- 不强制每个 owner 物理上只能有一个文件；machine publisher 和单个 Check 可以拥有自己的多文件 namespace。
- 不把 invocation evidence、cross-run state、cache 和 temporary workspace 合并成一个 generic `outputRoot`。
- 不把完整 flags、任意参数集合或最终结果编码进 invocation directory name；当前时间戳目录足以支持查找最新运行。
- 不改变 Scheduler admission、Check settlement、aggregation、machine facts 或 finding policy；本 Change 只改变路径、输出路由和 diagnostic projection。
- 不为人读日志建立稳定 parser/schema，也不从 diagnostic text 反向重建 machine facts。

## Decisions

### Intended Change

以下是本 Change 的已确认目标契约。字段名、模块拆分和安全编码算法属于 Plan 阶段的实现选择，不能改变这里声明的 authority、visibility、lifecycle 或 failure semantics。

#### Path authority 与可见性

1. Product 在 invocation creation 时形成唯一 frozen internal `ResolvedInvocationPaths`。它区分 absolute project root、invocation evidence targets、owner-specific channels、Check artifact base 与独立的 cross-run state；relative authoring values 只解析一次。
2. Gate 继续创建并拥有自己的 exact timestamped invocation directory，再把该目录映射到 Product output controls；Product 不在 Gate 已提供的 exact directory 下再创建一层 invocation directory。Standalone Product callers 继续显式选择各 output directory，不因本 Change 被迫采用 Gate layout。
3. Caller 通过明确的 per-invocation Check artifact base control 选择是否授予 Check 写入能力。Public Check context 不暴露完整 owner path map，也不授予读取或写入其它 owner channel 的能力；每个 executable Check 只获得共享 invocation identity、absolute project root，以及为当前 stable Check ID 解析出的 artifact directory。Caller 未配置 artifact base 时该值为 `null`，不能返回一个看似可写但未启用的路径。
4. Check artifact directory 使用 stable Check ID 的确定性 filesystem-safe encoding；原始 Check ID 仍由 context/machine facts 保存。不同 Check ID 不得映射到同一路径，Check 也不得自行拼接 sibling namespace。process Checks 不再通过 constructor 或 Definition closure 接收 `invocationLogDirectory`。
5. Persistent state 与 temporary workspace 不进入 Check invocation path context。Scheduler history、package candidate、Check cache 和 external-tool workspace 继续由各自 owner 的现有配置与 lifecycle 管理。

#### Owner channels 与 namespace

6. Project Gate 的 invocation evidence 采用下列 owner mapping；这是 Gate layout 的目标 contract：

   ```text
   <invocation>/
   ├── gate.log
   ├── progress.log
   ├── core-<utc-compact>-<product-uuid>.log
   ├── scheduler-<utc-compact>-<product-uuid>.log
   ├── learned-admission-<utc-compact>-<product-uuid>.log
   ├── machine/
   │   ├── run.json
   │   └── records.ndjson
   └── checks/
       └── <encoded-check-id>/
           └── process.log
   ```

7. Product 保留一个顶层 `diagnosticLogging` 配置入口，避免把 Run 配置重新拆散；该 owner 在内部路由到 `core`、`scheduler` 与 `learnedAdmission` channels。三个文件采用 owner-first 名称并共享 `<utc-compact>-<product-uuid>` suffix，从而在 Gate 的唯一目录中易于识别，同时保留 generic diagnostic directory 下并发 Run 的 collision safety。Readback 公开 aggregate diagnostic status 和 per-channel file/status map，使调用方可以定位部分失败，而不把三个内部 channel 伪装成三个互不相关的顶层 outputs。
8. `gate.log` 只承接 Gate adapter 与 Gate-owned `afterGate` result messages；`progress.log` 承接 Product progress、Check presentation messages 与完整 duration 列表。Gate transcript 不再通过无差别 patch 把 Product progress 复制进自己的 owner channel。
9. `core-<suffix>.log` 承接 Run creation/planning、Check lifecycle、Record acceptance identity、aggregation、output settlement 与 terminal facts；`scheduler-<suffix>.log` 承接 graph、decision 与 scheduler summary；`learned-admission-<suffix>.log` 承接 history read/write、prediction、learned proposal/admission 与 sample observation。文件名已经表达 owner，因此每行不再重复恒定的 owner tag/prefix，只保留 event、decision、phase 和 outcome 等会变化的筛选轴。
10. `learned-admission.log` 只在本 Run 选择 learned policy 时启用。Static/custom policy 的 channel readback 明确为 disabled 且不创建空文件；选择 learned policy 但 history unavailable 时，channel 仍启用并记录 unavailable 原因。只有 writer setup/write/close 失败才使该 channel failed。
11. Product diagnostic router 在写入 Core、Scheduler 与 learned-admission channels 前分配 Product-invocation-global sequence，并让这些 channels 共享 invocation ID 与 monotonic elapsed。单文件阅读按 owner 聚焦；需要重建 Product 内跨 owner 顺序时按 sequence 合并。Gate 与 progress 保持各自的有序 transcript，并通过同一 invocation identity 和明确的 Product Run phase boundary 关联，不为追求单一序列重新耦合 writer。
12. Machine publisher 继续只拥有 canonical `run.json` 与 `records.ndjson` atomic pair。Project Gate 把 machine output directory 指向 `<invocation>/machine/`；文件 bytes 和 v4 schema 不因目录移动而变化，因此仅移动 Gate target 不触发 schema version bump。Standalone Product callers 仍自行选择 machine directory。

#### 冗余删除规则

13. Scheduler graph 在 `scheduler-<suffix>.log` 开头完整写入一次并形成 fingerprint。每个 decision 只写 graph fingerprint、trigger、dynamic candidates、running/capacity、blockers、proposal、hard guard 与 actual decision；不能仅因数值相同删除本轮动态 decision facts。
14. `record.reported` 成功路径只写 `{ checkId, recordId, result }` 和定位 machine Record 所需的信息，不复制完整 data；被拒绝的 Record 写有界 validation category，不回显未经接受的 raw payload。Machine disabled/failed 时 diagnostic 不接管 canonical Record persistence，调用方只能从当前 `RunResult` 读取仍成立的 facts。
15. `check.finished` 写 status、duration、phase、reason code、message count 与必要 failure category，不复制 passed/failed final data 或完整 messages。持久 outcome data 由 `machine/run.json` 拥有，持久 Records 由 `machine/records.ndjson` 拥有，presentation messages 由 `progress.log` 与 `RunResult.checkMessages` 拥有。
16. 完整 per-Check duration 由 progress owner 一次性呈现，包含未执行 Check 的 `null`；diagnostic 不再额外输出 Top-N 或复制整张 duration 表。

#### 兼容与阶段边界

17. Project Gate invocation layout 与 human diagnostic shape 采用 hard cut，不做双写或旧文件兼容别名。调用方若依赖旧路径，必须随本 Change 一起迁移；machine schema 只有在 canonical bytes 改变时才升级。
18. Gate candidate preparation 继续发生在 invocation evidence 创建之前。本 Change 不扩大为 candidate preparation failure capture；candidate build/state 仍由 package candidate owner 保存。若后续要求 Gate 对 preparation failure 也提供 invocation evidence，应另立 Change 调整 invocation lifecycle。

### Resulting Impacts

- `src/check/check.ts`、RunControls、Project Definition normalization、invocation creation 与 callback assembly 需要增加最小 path context contract，并证明 concurrent Checks 观察同一 common bases、不同 Check namespace 互不冲突。
- 先前单个 `diagnosticLogging.file` readback 已演进为 aggregate diagnostic status 加 per-owner file/status map，并保留 failure priority 以及 disabled/not-run/succeeded/failed 区分。
- diagnostic logger 需要成为只负责 sequence、elapsed、routing 与 writer containment 的 owner-neutral router；Core、Scheduler 和 learned admission 不能通过共享 details object 再次混到同一 sink。
- progress renderer 需要显式拥有 terminal tee 与 `progress.log`，Gate transcript 需要停止全局捕获 Product output；setup、write、close failure 必须分别归因且不能静默丢失终端信息。
- machine publisher 仍拥有 canonical two-file atomic set；Gate target 从 invocation root 调整为 `machine/` namespace，publication validation、readback、Gate tests、docs examples 与引用路径必须同步，但 canonical bytes 不因路径移动而改变。
- Project Gate process transcript、test-evidence rule-test transcript、failure Record 和 terminal message 的 reference 需要从旧 `process/<check-id>.log` 语义迁移到 `checks/<encoded-check-id>/process.log`。
- Current owner docs、Architecture、Configuration、API mechanics、Output、Script Tooling 和测试策略需要同步新的 path、channel、status 与 correlation contract。
- 已演进的 active + unaligned Decisions `organize-owner-aware-project-run-and-gate-diagnostics.md`、`keep-gate-run-evidence-complete-with-owner-scoped-scheduler-context.md` 与 `publish-project-gate-machine-facts-in-machine-namespace.md` 承接本 Change 的长期方向；machine canonical ownership 只改变 Gate target namespace，不改变 publisher 仍只拥有 canonical pair 的约束。
- Tests 需要证明 owner isolation、Product diagnostic sequence uniqueness、graph-once/fingerprint reference、Record/final-data 不重复、完整 duration presentation、per-owner writer failure、disabled learned-admission channel、Check namespace collision prevention，以及 old mixed paths 不再产生。

## Risks / Trade-offs

- 拆分日志会失去直接 `tail` 单文件观察全局顺序的便利；共享 invocation identity、global sequence 和 elapsed 必须足以确定性恢复跨 owner 顺序。
- 多 writer 增加 setup、close 和部分失败组合；aggregate status 便于调用方判断整体结果，per-channel status map 则扩大 Product output contract，但这是准确归因部分失败所需的最小扩展。
- 只在 Scheduler graph 开头保留一次完整值，会把证据自包含边界从“每个 decision event”提高到“同一 scheduler owner channel”。日志截断时后半段 decision 可能失去 graph；需要以 fingerprint 和明确的 incomplete-log 诊断降低误读风险。
- 从 diagnostic 删除完整 Record/final data 后，人读排障需要同时打开 machine namespace；这正是 owner 分离的结果，但 owner paths 和 identity 必须足够直接，不能要求反向解析日志文本。
- 为所有 Check 暴露 writable namespace 可能鼓励无必要文件输出；contract 必须要求没有独立消费价值的 Check 继续只返回 result/Records/messages。
- Persistent cache 与 invocation artifact 都按 owner 命名，但生命周期仍不同；只看相似目录名不能推断清理、复用或 failure policy。

## Open Questions

当前没有需要产品 owner 继续选择的阻塞问题。下列内容留给 Plan 阶段按既有契约机械闭合，不得重新打开已确认的责任边界：

- public/internal type 的精确命名和模块位置；
- Check ID 的可逆或带 fingerprint 的 filesystem-safe encoding 算法；
- aggregate diagnostic failure priority 的现有规则如何复用到 per-channel status；
- owner router、writer 和 readback 测试的文件拆分。

## Implementation Sequence

1. 已演进与本设计冲突的 active Decisions，并已用 `bun run decisions -- check` 验证；新后继保持 unaligned，直到实现、owner 文档与验证证据成为当前事实后再核对 alignment。
2. 在 Product invocation creation 中建立 internal resolved paths，并以最小只读 projection 扩展 Check execution context。
3. 将单一 diagnostic sink 拆为 owner-neutral router 和三个 owner channels，先保持事件语义，再按本设计删除冗余 payload。
4. 把 Product progress、Gate transcript 与 Check artifacts 从全局 stream patch/Definition closure 迁移到各自 owner writer。
5. 将 Project Gate machine target 移入 `machine/`，同步 paths、references、docs 与 tests，但保持 v4 canonical bytes。
6. 补齐 owner isolation、writer partial failure、safe Check namespace、correlation、hard-cut absence 和完整 duration 证据，再运行 required Gate；本 Change 不以 full 作为常规迭代验证。
