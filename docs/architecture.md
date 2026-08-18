# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
                    ├─ direct Check execution
                    └─ frozen Core facts → policy / publication / effects / RunResult
```

当前实现是 `src/product/run/index.ts` 的 `run(ProjectDefinition, RunControls)`。项目拥有 TypeScript
Definition 和绑定它的 Run wrapper；Product 不拥有项目模块路径、配置发现或重新加载。npm 投影属于独立的
`establish-api-only-npm-product-boundary` Change，不改变这里的运行时契约。

## Definition boundary

`defineConfig` 返回普通 Project Definition value。它的递归 `checks` tree 由普通 `Check` values 组成：
`execution`、`options`、`recordTypes` 和 child `checks` 是同一对象上的字段。容器只向 descendants 传递
`dependsOn`、`mutex` 和 `maxParallel`，不形成独立 Core 或 output entity。

完整的 authoring grammar、默认值和 invocation contract 由 [Configuration](configuration.md) 拥有。Validation 在
任何 callback、scanner、cache、progress 或 output work 之前闭合 declarative data：它拒绝 unknown field 和 malformed
value，snapshot JSON options，验证完整 default options，并 canonicalize scheduling collection。trusted callback function
只保留给 execution；它们绝不进入 declarative fingerprint、Core snapshot 或 machine output。

## Execution boundary

Product 将 executable node 一次 flatten 为 canonical catalog。它只将 generic task engine 用于 graph validation、
dependency/mutex admission、root budget、cancellation 与 settlement。engine 不解释 Record、scanner protocol、quality
verdict 或 public Check field。

每个 executable Check 以 `{ options, project, records, signal }` 执行自己的 callback。callback 拥有 scanner
invocation 或其他项目工作，并返回 Check result。正常完成但质量失败表示
`{ status: "completed", verdict: "failed" }`，而不是 execution failure；callback 也可以明确返回
`not-applicable`。Product 将 ordinary throw、malformed result、Record misuse、cancellation 和 unavailable prerequisite
映射为 owning unavailable outcome。unavailable prerequisite 阻断 dependent user work，unrelated Check 仍可继续。

Cancellation 停止新的 admission，并将同一 signal 传给已 admitted callback；它不能在 Bun runtime 中强制停止
non-cooperative code。已 admitted work drain 后，Product 保留已 settled Check 与 Record，安全关闭其余 executable Check，
再返回 execution-phase cancellation facts。

## Core facts

Core session 将每个 canonical executable Check 恰好 register 一次，且只冻结 `checks` 与 `records`。Check 的
terminal outcome grammar 由 [Quality Metrics](quality-metrics.md#check-and-record-facts) 定义：

- `completed`，并带有 `passed` 或 `failed` verdict；
- `not-applicable`，可选 reason code；
- `unavailable`，带有 reason code 和可选 prerequisite `checkIds`。

callback 只能通过自己的 reporter 提交 Record candidate。Product 提供 Check ownership 与 Record identity，验证 declared
record type，拒绝 duplicate/late/invalid mutation，并在后续 ordinary failure 时保留已经 accepted 的 Record。Task identity、
callback closure、scheduler bookkeeping 和 scanner-private payload 都不是 Core facts。

## Default scanners and exact scope

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是带 direct callback 的 complete Check value。它们的 scanner
command 与 options 由 Check value 拥有，adapter 仍是 private protocol boundary。adapter 只接收所属 Check 的 exact
accepted file、options 与所需 cache context；callback 保留自己的 signal。adapter 在 Record conversion 前拒绝任何
out-of-scope result batch，且不向 Core 或 publication 暴露 raw scanner data。具体 option 与 adapter 规则见
[Scanner dependencies](scanner-dependencies.md)。

## Output and downstream boundary

Policy 消费 frozen Core facts 与 reference evidence。Publication 创建一个 validated machine model，再从它投影
`run.json`、`records.ndjson`、report、console 与 annotation input。精确 field 与 atomicity boundary 见
[Output](output.md)。

每个 structured `RunResult` 都包含 definition warning。configuration、planning、cancellation、execution、completion
与 effect result 是不同 outcome；run-level diagnostic code 只能取 documented result vocabulary。public inventory 只
暴露 authoring/run value 与 type，绝不暴露 Core capability、scanner adapter、task-engine internal 或 callback slot。

## Runtime boundary

项目 callback 在调用方的 Bun runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation
worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source
不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository dogfood 是单向的：`scripts/quality/project-run.ts` import repository Definition 并调用 Product `run`。
Workspace tooling 可以使用它拥有的 generic infrastructure，但不能获得 Product Core 或 Check settlement capability。
