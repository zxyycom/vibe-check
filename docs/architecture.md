# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
                    ├─ direct Check execution
                    └─ frozen Core facts → optional aggregation / publication / effects / RunResult
```

当前实现是 <code>src/run/run.ts</code> 的 <code>run(ProjectDefinition, RunControls)</code>，并由 <code>src/index.ts</code> 作为唯一 public package entry 导出。项目拥有 TypeScript Definition 和绑定它的 Run wrapper；Product 不拥有项目模块路径、配置发现或重新加载。

可能改变此边界的 active Change 与直接相关 Decision 见 [Active Change Portfolio](../changes/active-change-portfolio.md)。这些导航不改变本页当前运行时契约；只有实现、验证并同步对应 owner 后才更新架构事实。

## Definition boundary

`defineConfig` 返回普通 Project Definition value。它的递归 `checks` tree 由普通 `Check` values 组成：
`execution`、`options` 和 child `checks` 是同一对象上的字段。容器只向 descendants 传递
`dependsOn`、`mutex` 和 `maxParallel`，不形成独立 Core 或 output entity。

完整 authoring grammar、默认值和 invocation contract 由 [Configuration](configuration.md) 拥有。Validation 在任何 callback、scanner、cache、progress 或 output work 之前闭合 declarative data：它拒绝 unknown field 和 malformed value，snapshot JSON options，验证完整 default options，并 canonicalize scheduling collection。trusted callback function 只保留给 execution；它们绝不进入 declarative fingerprint、Core snapshot 或 machine output。

Definition grammar只描述递归 Check、调度、executable-only `visibility` 和 Check-owned execution/options。Typed provider 的 executable-only `parseData` 也是 trusted function：它保留给 runtime consumer，但不进入 declarative snapshot 或 fingerprint；其 public type relation 由 [Configuration](configuration.md#typed-dependency-data) 拥有。`visibility` 是 normalized declarative fingerprint 的一部分，但不控制执行；producing Check 自己定义 final data 与可选 Record data 的 domain shape；跨 Check 的聚合只由 invocation controls 显式请求，不成为 Definition 的第二套 domain grammar。

## Execution boundary

Product 将 executable node 一次 flatten 为 canonical catalog。它只将 generic task engine 用于 graph validation、
dependency/mutex admission、root budget、cancellation 与 settlement。engine 不解释 Record、scanner protocol、Check final data、Check terminal status 或 aggregation。

每个 executable Check 以 `{ dependencies, options, project, records, signal }` 执行自己的 callback。`project.flags` 是调用 controls 规范化后的 frozen string array；Product 不解释 token。callback 拥有 scanner invocation 或其它项目工作，并以 `passed(data)`、`failed(data)`、`not-applicable(reason?)` 或 `unavailable(reason)` 返回自己的 terminal result。`passed` / `failed` 的 data 是该 Check 的唯一主结果；没有领域数据时 Check 返回 `{}`。`not-applicable` 和 `unavailable` 不伪造 final data。

Product 将 ordinary throw、malformed result、Record misuse 和 cancellation 映射为 owning unavailable outcome。这个 execution boundary 将 author terminal result 与其 messages attachment 一起验证，再只把 stripped four-state result 交给 Core；只有 Core 接受该 result 后，detached messages 才进入 private lifecycle feedback 和 final-snapshot `RunResult.checkMessages`。throw、Product-created outcome、invalid attachment 或 Record diagnostic 都没有 author messages。四种 ordinary terminal status 都完成正常 dependency settlement；downstream 在 direct upstream settle 后运行，并通过 `dependencies.get(checkId)` 显式判断上游是否有可读 final data。Cancellation 停止新的 admission，并将同一 signal 传给已 admitted callback；它不能在 Bun runtime 中强制停止 non-cooperative code。已 admitted work drain 后，Product 保留已 settled Check 与 Record，安全关闭其余 executable Check，再返回 execution-phase cancellation facts。

Run 在 callback 前开始 monotonic per-Check measurement，并在 callback result、Record validation 与 Core settlement 后结束。这个 execution owner 将同一次 `{ checkId, durationMs | null }` 事实交给 private lifecycle feedback 和 final-snapshot `RunResult.checkDurations`，并将已接受 messages 按 canonical Check order、再按 author order 投影为 `RunResult.checkMessages`；duration 与 messages 都不进入 `CheckOutcome`、Record、Core 或 machine publication。progress renderer、feedback、target-stream capability、clock 与 scheduler integration 都是 package-private handoff：Product 拥有目标 stream 输出；项目 callback 必须把详细 process output 留在项目自己拥有的 transcript（例如 Project Gate 的 `.log/`），而不与该 stream 穿插。这类 transcript 不是 Product effect，也不属于 machine output。

## Core facts

Core session 将每个 canonical executable Check 恰好 register 一次，且只冻结 `checks` 与 `records`。Check 的 terminal outcome grammar 由 [Quality Metrics](quality-metrics.md#check-and-record-facts) 定义：

- `passed`，带有 canonical final data；
- `failed`，带有 canonical final data；
- `not-applicable`，可选 reason code；
- `unavailable`，带有 Product or author-controlled reason code 和可选 prerequisite `checkIds`。

callback 只能通过自己的 reporter 提交 supplemental Record：`records.report({ id }, data)`。Product 提供 Check ownership 与 structural `{ checkId, id }` identity，验证 canonical safety、拒绝 duplicate/late/invalid mutation，并在后续 ordinary failure 时保留已经 accepted 的 Record。final data 与 Record data 都 materialize 为 detached、null-prototype、deep-frozen canonical JSON object；snapshot 不承诺 JavaScript own-key enumeration order。Check-local domain shape和canonical text/bytes ordering由 [Quality Metrics](quality-metrics.md#check-and-record-facts)分别界定。Task identity、callback closure、scheduler bookkeeping 和 scanner-private payload 都不是 Core facts。

Raw Core facts 始终可供 completed/effect `RunResult` generic readback。只有 caller 显式提供 `RunControls.checkAggregation` 时，Run 才从选定 settled Check statuses 产生最小 `aggregate`；没有配置时该字段为 `null`。aggregation 不读取 Record data、definition warning、effect status 或 presentation，也不替代项目的 raw facts。

Run callback-local dependency view 只授权当前 Check 的 normalized effective direct dependency IDs。`dependencies.get(checkId)` 读取 Core package-private settled Check seam：`passed` / `failed` 返回同一个 canonical final data 引用；`not-applicable` / `unavailable` 返回 closed read failure；未声明、transitive 或 malformed ID 不返回任何 upstream fact。Product 不调用 provider parser、不读取 supplemental Records，也不为 dependency reads 建立第二套 facts store。

## Default scanners and exact scope

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是带 direct callback 的 complete Check value。它们的 scanner command 与 options 由 Check value 拥有，adapter 仍是 private protocol boundary。adapter 只接收所属 Check 的 exact accepted file、options 与所需 cache context；callback 保留自己的 signal。adapter 在 conversion 前拒绝任何 out-of-scope result batch，且不向 Core 或 publication 暴露 raw scanner data。每个 default 通过自己的 final data 表达本次 threshold conclusion；只有详细 finding 是补充事实时才报告 Record。具体 default option 值见 [Configuration](configuration.md#defaults-and-native-composition)；private adapter 规则见 [Scanner dependencies](scanner-dependencies.md)。

## Output and downstream boundary

Publication 创建一个 validated machine v4 model，再从它投影 `run.json` 和 `records.ndjson`。v4 Check row 投影 terminal status 及 passed/failed final data；Record row 投影 `{ checkId, id, data }`。aggregation、effect与人读展示仍留在各自的 Run/consumer boundary。精确 field、complete-set fingerprint 与 atomicity boundary 见 [Output](output.md)。

每个 structured `RunResult` 都包含 definition warning。configuration、planning、cancellation、execution、completion 与 effect result 是不同 outcome；run-level diagnostic code 只能取 documented result vocabulary。带 final snapshot 的 result 还携带 canonical per-Check duration summary、accepted detached terminal-message readback 与 optional aggregate。public inventory 只暴露 authoring/run value 与 type，绝不暴露 Core capability、scanner adapter、task-engine internal、callback slot 或 lifecycle renderer/stream/clock handoff。

## Runtime boundary

项目 callback 在调用方的 Bun runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source 不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository dogfood 是单向的：`scripts/project/quality/project-run.ts` 从 exact installed `vibe-check` public entry 导入 `run`，绑定 repository Definition 后执行。Workspace tooling 可以使用它拥有的 generic infrastructure，但不能获得 Product Core 或 Check settlement capability。
