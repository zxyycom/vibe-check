# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
                    ├─ invocation-wide Check preflight barrier
                    ├─ ready Check direct execution
                    └─ frozen Check facts → optional aggregation / publication / outputs / RunResult
```

当前实现是 <code>src/project-run/run.ts</code> 的 <code>run(ProjectDefinition, RunControls)</code>，并由 <code>src/index.ts</code> 作为唯一 public package entry 导出。项目拥有 TypeScript Definition 和绑定它的 Run wrapper；Product 不拥有项目模块路径、配置发现或重新加载。

## Source module boundaries

`src/` 的 Product module 按以下 owner 划分：

- `src/check/**` 拥有 ordinary Check contract、Definition/identity validation 与 options snapshot；
- `src/project-definition/**` 拥有 Project Definition tree、defaults、validation、normalization 与 fingerprint；
- `src/check-settlement/**` 拥有 terminal Check/Record facts、session、store 与 fact validation；
- `src/project-run/**` 拥有 Run entry、invocation、aggregation、project context、completion/result，以及独立的
  `check-execution/**`、`controls/**`、`diagnostic-logging/**`、`progress-rendering/**` 与 `task-scheduler/**` 子 owner；
- `src/machine-output/v4/**` 拥有从 Check facts 向 versioned machine artifacts 的 publication；
- `src/package-checks/<check-owner>/**` 拥有 package-provided ordinary Checks 与 Check-owned scanners；其同级 `project-files/**`、`host-environment/**` 是该 delivery owner 的真实共同能力；
- `src/data-boundary/**` 拥有 canonical JSON/data、closed-value snapshot 与跨 core owner 的 type guards；
- `scripts/docs/package-api/**` 拥有 package、文档与 candidate tooling 共用的 public-root inventory。

生产依赖方向由 `src/index.ts` 组合 public roots；Project Definition 与 Check facts 不相互依赖，二者都只依赖
ordinary Check contract。task scheduler 只是 Run 的 private child，不形成第二个顶层产品模块。源码不为这些模块额外建立
`index.ts` barrel 或 compatibility re-export。

可能改变此边界的 active Change 与直接相关 Decision 见 [Active Change Portfolio](../changes/active-change-portfolio.md)。这些导航不改变本页当前运行时契约；只有实现、验证并同步对应 owner 后才更新架构事实。

## Definition boundary

`defineConfig` 返回普通 Project Definition value。它的递归 `checks` tree 由普通 `Check` values 组成：
`execution`、`options` 和 child `checks` 是同一对象上的字段。容器只向 descendants 传递
`dependsOn`、`mutex` 和 `maxParallel`，不形成独立 Check-facts 或 output entity。

完整 authoring grammar、默认值和 invocation contract 由 [Configuration](configuration.md) 拥有。Definition validation 在任何 execution、scanner、cache、progress 或 output work 之前闭合 ordinary Check grammar：它拒绝 unknown Check field 和 malformed scheduling value，将每个 Check 的 `options` snapshot 为 canonical immutable JSON object，并 canonicalize scheduling collection。Definition 不识别 package-provided Check ID，也不解释其 option shape。

Definition grammar 只描述递归 Check、调度、executable-only `visibility`、Check-owned execution/options 及可选 `preflight`。`preflight`、`execution` 与 typed provider 的 executable-only `parseData` 都是 trusted functions：Definition 保留函数 identity，但不调用函数，也不把它们写入 declarative snapshot、fingerprint、Check-facts snapshot 或 machine output。Typed provider 的 public type relation 由 [Configuration](configuration.md#typed-dependency-data) 拥有。`visibility` 是 normalized declarative fingerprint 的一部分，但不控制执行；producing Check 自己定义 final data 与可选 Record data 的 domain shape；跨 Check 的聚合只由 invocation controls 显式请求，不成为 Definition 的第二套 domain grammar。

## Execution boundary

Product 将 executable node 一次 flatten 为 canonical catalog。它只将 generic task engine 用于 graph validation、
dependency/mutex admission、root budget、cancellation 与 settlement。engine 不解释 Record、scanner protocol、Check final data、Check terminal status 或 aggregation。

Task admission 前，Run 按 Definition 顺序执行 invocation-wide Check preflight barrier；未提供 `preflight` 的 Check 直接使用 authored options。每个 preflight 收到 Definition 已 snapshot 的 options 与本次 invocation 的 cancellation signal。`block`、throw、malformed result 或 noncanonical prepared/fallback value 只结算 owning Check 为 `unavailable`，不进入 scheduler，也没有 started lifecycle fact；ready Check 才以 prepared/fallback options 进入 Task graph。barrier 属于 execution phase，但 invocation preparation 和 progress setup 可以先发生；它只保证任何 author Check execution、scanner 或其它 Check-local execution work 尚未开始。精确结果 grammar、messages 与 reason 映射见 [Configuration](configuration.md#check-options-preflight)。

每个 executable Check 以 `{ dependencies, options, project, records, signal }` 执行自己的 callback。`project` 只携带 normalized root 与由 invocation controls 形成的 canonical `flags`；Check-owned file selection 与 cache configuration 保留在 owning Check options，共享领域事实通过声明的 direct dependencies 进入。Product 不替 package-provided Check 注入文件 scope 或领域 policy。callback 拥有 scanner invocation 或其它项目工作，并以 `passed(data)`、`failed(data)`、`not-applicable(reason?)` 或 `unavailable(reason)` 返回自己的 terminal result。`passed` / `failed` 的 data 是该 Check 的唯一主结果；没有领域数据时 Check 返回 `{}`。`not-applicable` 和 `unavailable` 不伪造 final data。

Product 将 ordinary throw、malformed result、Record misuse 和 cancellation 映射为 owning unavailable outcome。这个 execution boundary 将 author terminal result 与其 messages attachment 一起验证，再只把 stripped four-state result 交给 Check facts；只有 Check facts 接受该 result 后，detached messages 才进入 private lifecycle feedback 和 final-snapshot `RunResult.checkMessages`。throw、Product-created outcome、invalid attachment 或 Record diagnostic 都没有 author messages。四种 ordinary terminal status 都完成正常 dependency settlement；downstream 在 direct upstream settle 后运行，并通过 `dependencies.get(checkId)` 显式判断上游是否有可读 final data。Cancellation 停止新的 admission，并将同一 signal 传给已 admitted callback；它不能在 Bun runtime 中强制停止 non-cooperative code。已 admitted work drain 后，Product 保留已 settled Check 与 Record，安全关闭其余 executable Check，再返回 execution-phase cancellation facts。

Run 在 callback 前开始 monotonic per-Check measurement，并在 callback result、Record validation 与 Check-facts settlement 后结束。这个 execution owner 将同一次 `{ checkId, durationMs | null }` 事实交给 private lifecycle feedback 和 final-snapshot `RunResult.checkDurations`，并将已接受 messages 按 canonical Check order、再按 author order 投影为 `RunResult.checkMessages`；duration 与 messages 都不进入 `CheckOutcome`、Record、Check facts 或 machine publication。progress renderer、feedback、target-stream capability、clock 与 scheduler integration 都是 package-private handoff：Product 拥有目标 stream 输出；项目 callback 必须把详细 process output 留在项目自己拥有的 transcript（例如 Project Gate 的 `.log/`），而不与该 stream 穿插。这类 transcript 不是 Product output，也不属于 machine output。

## Check facts

Check-facts session 将每个 canonical executable Check 恰好 register 一次，且只冻结 `checks` 与 `records`。Check 的 terminal outcome grammar 由 [Quality Metrics](quality-metrics.md#check-and-record-facts) 定义：

- `passed`，带有 canonical final data；
- `failed`，带有 canonical final data；
- `not-applicable`，可选 reason code；
- `unavailable`，带有 Product or author-controlled reason code 和可选 prerequisite `checkIds`。

callback 只能通过自己的 reporter 提交 supplemental Record：`records.report({ id }, data)`。Product 提供 Check ownership 与 structural `{ checkId, id }` identity，验证 canonical safety、拒绝 duplicate/late/invalid mutation，并在后续 ordinary failure 时保留已经 accepted 的 Record。final data 与 Record data 都 materialize 为 detached、null-prototype、deep-frozen canonical JSON object；snapshot 不承诺 JavaScript own-key enumeration order。Check-local domain shape和canonical text/bytes ordering由 [Quality Metrics](quality-metrics.md#check-and-record-facts)分别界定。Task identity、callback closure、scheduler bookkeeping 和 scanner-private payload 都不是 Check facts。

Raw Check facts 始终可供 completed/output `RunResult` generic readback。只有 caller 显式提供 `RunControls.checkAggregation` 时，Run 才从选定 settled Check statuses 产生最小 `aggregate`；没有配置时该字段为 `null`。aggregation 不读取 Record data、definition warning、output status 或 presentation，也不替代项目的 raw facts。

Run callback-local dependency view 只授权当前 Check 的 normalized effective direct dependency IDs。`dependencies.get(checkId)` 读取 Check-facts package-private settled Check seam：`passed` / `failed` 返回同一个 canonical final data 引用；`not-applicable` / `unavailable` 返回 closed read failure；未声明、transitive 或 malformed ID 不返回任何 upstream fact。Product 不调用 provider parser、不读取 supplemental Records，也不为 dependency reads 建立第二套 facts store。

## Package-provided Checks and exact inputs

七个 package-provided exports 都从同一普通 Check 基础构造并返回 ordinary Check values；除
`maintenanceReminders(entries)` 外，其余六个 constructors 接收可省略 authoring policy、补齐完整 resolved options。它们
因为随 package 提供而方便使用，但不获得 Definition/Check facts 特权。每项 Check 完整拥有自己的
options type、runtime validation、execution、领域 measurement/finding model 与 documentation。三个基于 area 的代码质量
Check 只在 package-checks 内共享 `blocking | non-blocking` policy、重叠区域合并和 Finding 计数；各 Check 继续拥有阈值、
scanner protocol、candidate conversion、Record identity/data 与 unavailable vocabulary，Core 不解释这套 Finding policy。

需要项目文件的 Check 将完整 file selection 放在自己的 options 中，并独立调用 `src/package-checks/project-files/**` 的真实共同 collection/exact-membership mechanism；metric Check 也分别拥有自己的 code-area policy。jscpd、scc 与 Lizard adapter 分别位于唯一 producing Check 内，不存在集中 scanner owner 或 Definition registry。adapter 只接收所属 Check 的 exact accepted files、command options 与必要 Check-owned cache options，在 conversion 前拒绝任何 out-of-set result batch，且不向 Check facts 或 publication 暴露 raw scanner data。SCC 与 Lizard 的 CSV parsing 各由自身 adapter local module 承接，因 header/row 义务可独立变化。每个 Check 通过自己的 final data 表达 conclusion；只有详细 finding 是补充事实时才报告 Record。具体初始 option 值见 [Configuration](configuration.md#package-provided-check-composition)，file mechanism 见 [Project files and Check exact inputs](scan-scope.md)，private tool 边界见 [Check-owned scanner dependencies](scanner-dependencies.md)。

## Output and downstream boundary

Publication 创建一个 validated machine v4 model，再从它投影 `run.json` 和 `records.ndjson`。v4 Check row 投影 terminal status 及 passed/failed final data；Record row 投影 `{ checkId, id, data }`。aggregation、output status 与人读展示仍留在各自的 Run/consumer boundary。`diagnostic-logging/**` 只在 Product 已知事实形成处连续追加 invocation-local 人读材料；它不从 final snapshot 或 process transcript 重建过程，不进入 machine v4，也不向 Check callback 增加 logger。每个 package-provided Check 的 parser 只验证自己的 final-data object，不替代 machine complete-set validation。精确 field、complete-set fingerprint 与 atomicity boundary 见 [Output](output.md)。

每个 structured `RunResult` 都包含 definition warning。configuration、planning、cancellation、execution、completion 与 output result 是不同 outcome；run-level diagnostic code 只能取 documented result vocabulary。带 final snapshot 的 result 还携带 canonical per-Check duration summary、accepted detached terminal-message readback 与 optional aggregate。public inventory 只暴露 authoring/run value 与 type，绝不暴露 Check-facts capability、scanner adapter、task-engine internal、callback slot 或 lifecycle renderer/stream/clock handoff。

## Runtime boundary

项目 callback 在调用方的 Bun runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source 不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository Gate 单向地从 exact installed `vibe-check` public entry 导入 `run`。Gate adapter 为每次 invocation 创建并拥有其 directory，再只通过本次 Run Controls 将 diagnostic output 定向到该 directory，与 process transcripts 并列；测试则使用并清理自己的 fixture directory。Workspace tooling 可以使用它拥有的 generic infrastructure，但不能获得 Product Check-facts 或 Check settlement capability。
