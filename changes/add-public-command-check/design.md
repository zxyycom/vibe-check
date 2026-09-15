# Design

`commandCheck(...)` 是 ordinary Check authoring 的 process-backed constructor：Product 负责 command lifecycle，caller 负责工具语义。

## Context

- Decision [`provide-public-command-check.md`](../../docs/decisions/provide-public-command-check.md) 确定 package-root constructor、Product-owned process lifecycle 与 caller-owned tool semantics；本 Change 通过验收后已与该方向对齐。
- Ordinary Check 的 lifecycle、canonical data、cancellation、artifact capability 与 settlement 由 [`api-mechanics.md`](../../docs/api-mechanics.md) 和 [`extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md) 拥有。
- Product helper `src/package-checks/host-environment/process/**` 已提供 no-shell execa execution、plain-text environment、timeout 与 bounded capture。其 async path 需要转发 `AbortSignal`，并把 cancellation、timeout 与 max-buffer flags 保留为 private closed result。
- Product 内置 process consumers 保留 tool-specific parsing 与 availability；`scripts/project/gate/checks/process/**` 保留 Gate transcript、safe failure 与 result projection。

## Goals / Non-Goals

### Goals

- 在 constructor 与 preparation 两个入口验证同一 closed command policy，并保留 literal `checkId`。
- 复用 ordinary selection、dependency、resource、scheduling 与 settlement contract。
- 统一 child lifecycle，仅发布 exit code、stable reason code 和显式 Check transcript，并由 installed consumer 证明 package-root 路径。

### Non-Goals

本 Change 不建立 shell/pipeline/workflow runtime，也不建立第二套 parser、Records projection、typed provider 或 process-exit adapter。Tool-specific Product Checks 与 Project Gate 继续使用各自 owner。

## Decisions

### Intended Change

#### Public constructor and input

`commandCheck<Id>(input: CommandCheckInput<Id>): CommandCheck<Id>` 位于 `src/package-checks/command-check/**` 并从 package root 导出。Public named types 固定为 `CommandCheckInput`、`CommandCheckEnvironment`、`CommandCheckOutput`、`CommandCheckFinalData`、`CommandCheckUnavailableReasonCode` 与 `CommandCheck`。

`CommandCheckInput` 同时接受 ordinary executable Check 的 `enabledByFlags`、`checks`、`dependsOn`、`observes`、`maxParallel`、`admissionPriority`、`mutex`、`resourceClaims` 与 `omitQuietPassedRow`。Constructor 拒绝 unknown fields 和非法值，返回 detached、frozen resolved options；`prepare` 再验证 resolved shape。非法 constructor input 抛 `TypeError`，非法 prepared options 返回 `unavailable / invalid-options`。

| Field | Contract | Omission |
| --- | --- | --- |
| `checkId` | 非空 string，保留 literal type | required |
| `displayName` | 非空 string | required |
| `executable` | 非空且无 NUL 的单一 no-shell executable | required |
| `arguments` | dense readonly string array；item 可为空但不得含 NUL | `[]` |
| `workingDirectory` | 非空且无 NUL；relative value 从 project root 解析，absolute value 保持原 target | project root |
| `environment` | `CommandCheckEnvironment` | `{ mode: "exact" }` |
| `timeoutMs` | 正安全整数 | required |
| `outputByteLimit` | 正安全整数；分别作为 stdout 与 stderr 的 byte ceiling | required |
| `output` | `CommandCheckOutput` | `{ mode: "discard" }` |

Executable 可使用 absolute path 或 platform-resolved name；实际 resolution 由 no-shell child process 与最终 environment 决定。Package acceptance 使用 `process.execPath`。一次执行最多在内存中保留两倍 `outputByteLimit` 的 child output。

#### Environment and output

| Policy | Behavior |
| --- | --- |
| `environment: { mode: "exact", variables? }` | 只使用 `Record<string, string>` variables；omission 等同 exact-empty。 |
| `environment: { mode: "inherit", overrides? }` | 在 execution start snapshot `process.env`，以 string 覆盖并用 `null` 删除 key。 |
| `output: { mode: "discard" }` | 在 bounded invocation memory 捕获 output，完成 classification 后释放。 |
| `output: { mode: "transcript" }` | 在 Check `artifactDirectory` 中原子维护固定 `process.log`：spawn 前写 running state，settlement 后写 closed status metadata、raw stdout 与 raw stderr。 |

Environment branches 拒绝 unknown fields、accessor/prototype tricks、undefined、非 string values 及 name/value 中的 NUL；Product 最后覆盖 plain-text/no-color variables。Resolved environment 不进入 facts 或 diagnostics。

Transcript 不写 executable、arguments、environment 或 native error text。缺少 artifact capability 或 running/final write 失败时返回 `command-transcript-unavailable`，且不把 raw material 投影到 final data、Records、messages、console、diagnostic 或 machine publication。

#### Terminal mapping

| Process cause | Check result |
| --- | --- |
| exit code `0` | `passed / { exitCode: 0 }` |
| numeric nonzero exit | `failed / { exitCode }` |
| startup failure | `unavailable / command-start-failed` |
| timeout | `unavailable / command-timeout` |
| stdout 或 stderr 达到 byte limit | `unavailable / command-output-limit-exceeded` |
| non-timeout、non-cancellation signal | `unavailable / command-terminated-by-signal` |
| transcript capability 或 write failure | `unavailable / command-transcript-unavailable` |
| invalid prepared options | `unavailable / invalid-options` |
| caller cancellation observed by Core | Product-owned `unavailable / execution-cancelled` |

Private process normalization 使用 `nonzero numeric exit > cancellation > timeout > max-buffer > signal > startup failure > zero exit` 的 cause priority，且不读取 native error text。只有 nonzero numeric exit 因此不会被稍后到达 process adapter 的 abort 重分类；`max-buffer` 即使可同时带有 zero exit status，也在该 status 之前结算。Core 在 callback 返回时观察到 aborted signal 时仍按既有规则产生 `execution-cancelled`。

#### Ownership and delivery

Private process runner 保留在 `src/package-checks/host-environment/process/**`，command-specific types、validation、execution、transcript 与 mapping 由 `src/package-checks/command-check/**` 完整拥有。若该依赖方向不成立，先修订 architecture owner 再继续。

新增 packaged command guide，完整拥有 input、environment、output、terminal mapping 与 security boundary。README/navigation 只提供入口；registry-managed example 同时投影到 guide 与 constructor JSDoc。Root exports、public inventory、declarations、package materials 与 installed consumer 使用同一组名称和示例。

### Resulting Impacts

1. Process owner 增加 cancellation forwarding 与 closed cause flags，同时保持 sync runner 和既有 consumers 的语义。
2. Command owner 新增 public contract、artifact lifecycle 与直接测试，但不进入 Core settlement 或 Gate policy。
3. Default execution 不持久化 child material；ambient environment 与 raw transcript 只通过显式 branch 进入 caller 选择的边界。
4. Test Evidence、docs/JSDoc、public inventory、artifact audit 与 installed-consumer evidence 随实现同步闭合。

## Risks / Trade-offs

- Fixed exit mapping 只覆盖 exit-status protocol；structured-output consumer 继续使用 `defineCheck`。
- Required timeout 与 byte limit 避免固化任意 workload defaults，但增加每个 command 的配置。
- Explicit environment inheritance 与 transcript 提供实用能力，也允许 ambient credentials 或 raw output 进入 caller 选择的边界；exact-empty 与 discard 保持安全默认值。
- Platform-resolved executable 依赖 invocation environment；contract 只保证传递和分类，不保证工具发现。

## Open Questions

无。Public contract、owner、security defaults、opt-in branches、terminal mapping 与 verification boundary 已固定，可直接执行 tasks。
