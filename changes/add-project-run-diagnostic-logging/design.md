# Design

本设计把 diagnostic logging 建模为 Product core 拥有的第三个 Run output；它记录 core 能直接证明的运行时事实，Check-specific 领域信息继续只通过 final data、supplemental Record 和 terminal message 输出。

## Context

当前事实来源及其对本 Change 的约束如下：

- [`docs/architecture.md`](../../docs/architecture.md#execution-boundary) 与 `src/project-run/**` 拥有 normalization、planning、preflight handoff、scheduler、Check execution/settlement、cancellation、aggregation 和 outputs；日志事件必须在这些事实形成位置产生。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md#outputs-与-runresult-边界) 拥有 `RunResult` output readback；[`docs/output.md`](../../docs/output.md) 只拥有 machine v4 publication 及其对 diagnostic logging 的排除。两者都不得从 final facts 倒推 chronology，日志也不得进入 machine v4。
- [`docs/script-tooling.md`](../../docs/script-tooling.md#process-evidence) 与 `scripts/project/gate/**` 拥有 command transcripts；Product log解释 core 如何调度和结算 Check，不复制或解释 transcript 内部内容。
- Check callback 已用 final data、Record 和 message 表达领域输出。给 Check 增加 logger 会建立第四条输出路径，且 Product 无法定义各 Check 应写什么，因此 Check surface保持不变。
- [`add-ephemeral-project-run-diagnostic-logging.md`](../../docs/decisions/add-ephemeral-project-run-diagnostic-logging.md) 以“修订”关系演进 [`replace-global-tool-effects-with-run-outputs.md`](../../docs/decisions/archive/replace-global-tool-effects-with-run-outputs.md)：保留明确 Run output 与 Check-owned cache 的方向，并接受第三个一次性 diagnostic logging output。Decision 生命周期由该 Decision 自身拥有。

proposal 的 Outcome/Scope/Success Criteria 划定交付边界，本 design 的 Decisions 说明方案约束，tasks 记录实施与验证完成状态；链接的稳定 owner、源码与 tests仍是当前事实来源。日志格式示例只定义本 Change 的人读验收结果，不建立外部解析契约。

## Goals / Non-Goals

### Goals

- 让有效 Project Run 在不挂断点、不插入调试用 `console` 的情况下留下详细 core 过程材料。
- 对启用状态下产生的所有 core entry 做无级别过滤的连续写入，并在并发情况下保留唯一实际观察顺序。
- 覆盖 invocation、planning、preflight handoff、scheduler、dependency/Record 操作、callback handoff、settlement、cancellation、aggregation 和 output closure。
- 外部 package 默认零日志 I/O，本仓库 quality/Gate 默认获得日志。
- 让 logging failure 可定位，但不成为 Check execution 或 Check facts 的第二控制面。

### Non-Goals

- 不给 `CheckExecutionContext`、`CheckPreflight` 或 package-provided/custom Check 增加 logger、trace emitter 或日志配置。
- 不用日志替代 Check final data、Record、message 或 process transcript。
- 不为无效 Definition/Controls 创建 best-effort 日志；这些输入尚未提供可信 output configuration。
- 不提供 parser、JSON/NDJSON schema、schema version、稳定 event vocabulary、跨版本格式兼容或迁移。
- 不把日志发布进 machine v4、package/release artifact 或 supplemental Record。
- 不建立 level/filter/sampling、remote transport、rotation、retention、cleanup、`latest`、跨 invocation search 或集中日志服务。
- 不自动枚举 ambient process environment、credential store 或其它未被当前 Run 消费的进程状态。

## Decisions

### Intended Change

1. **增加第三个明确 Run output。** 当前配置与结果形状为：

   | Owner | Shape / rule |
   | --- | --- |
   | `ProjectOutputs.diagnosticLogging` | `{ enabled: boolean, directory: string }`；默认 `{ enabled: false, directory: ".log/vibe-check" }` |
   | Run Controls override | 按 invocation 覆盖 `enabled` 或 `directory`，沿用 closed-key、relative-directory 和 project-root containment validation |
   | `RunResult.outputs.diagnosticLogging` | `{ enabled, status, file }`；`file` 为 project-root-relative `string` 或 disabled 时的 `null` |
   | machine v4 | 不增加字段，也不引用日志文件 |

   Product 在任何 I/O 前从 effective directory 和 invocation UUID 计算 `run-<uuid>.log`。启用后，即使 create 失败，result status仍返回该目标 file。所有`kind: "configuration"`分支，包括需要 normalized catalog 才能判定的 invalid aggregation selection，都在 logger初始化前完成且继续不带`outputs`；实现可以先纯计算 effective configuration，但不得在排除这些分支前创建目录或writer。

2. **logging 生命周期包围所有非 configuration Run 分支。** Definition、Controls和aggregation selection验证成功后创建 invocation identity、effective output configuration 和 Product-private logger，再进入 pre-work cancellation、planning 与 execution。所有 planning、cancellation、execution和completion路径都通过同一个`finalizeInvocation(candidateResult)`闭合：先记录不依赖日志自身状态的pre-logging result branch与已知output statuses，再close logger、取得最终logging status，最后按既定优先级构造`RunResult`。disabled 不创建 writer且 status为 `disabled`；成功 close 后为 `succeeded`；create/render/append/close 任一步失败后为 `failed`，不再尝试普通 entry。

   ```text
   Definition/Controls/aggregation selection failed -> configuration result; no log
   configuration branches ruled out
     -> compute invocation/file
     -> initialize logger
     -> planning/preflight/scheduling/execution/completion
     -> candidate result + pre-logging final entry
     -> close logger and resolve its status
     -> final RunResult with diagnosticLogging status/file
   ```

   文件不能观察已经发生在自身close之后的事实，因此最后一条完整entry只声明core/pre-logging branch；close failure及其可能选中的`diagnostic-logging-failed` output diagnostic只由返回的`RunResult`表达。这不是缺失事件，也不得通过close后重新打开文件伪造自我观察。

3. **日志是有结构的人读文本，不是协议。** 每个 entry 使用一行自足 envelope：

   ```text
   #000012 +18.4ms check:file-metrics:preflight preflight.succeeded prepared options accepted details={...}
   ```

   sequence 由 invocation logger 从 1 单调分配；elapsed 使用与 Run timing 同源的 monotonic clock；scope 取 `run`、`scheduler`、`output:<name>`、`check:<checkId>:preflight` 或 `check:<checkId>:execution`；event 使用描述性的实现名称；summary 是非空人读结论；details 采用确定性、控制字符转义后的单行表示。格式可以随实现 hard cut，但同一次日志中的 scope、关联 ID 和顺序必须自洽。

   logger提供同步、non-throwing的`observe` seam：在调用点分配sequence并完成render，以单个完整buffer串行append后才返回；底层遇到partial write时继续写完该buffer或永久failed。这样同步的dependency read与Record report也能在事实形成位置记录，并且不同异步Check的entry不会交错。正常invocation由统一finalizer关闭writer；进程被强制终止时允许最后一行截断，读取者只把最后一个newline-terminated entry视为完整事实，不承诺`fsync`级持久性。

4. **required core event set 按事实 owner 划分。** 实现不得以一个粗粒度 lifecycle hook 代替下列事实：

   | Phase / owner | Required observations |
   | --- | --- |
   | invocation / planning | invocation ID、project root、effective outputs、flags、normalized catalog、scheduler policy、graph validation/result |
   | preflight | Check ID、start、authored options、success/continue/block/throw/malformed、prepared/fallback options、reason/messages、elapsed |
   | scheduler | pending/ready/running counts、dependency/mutex/root-budget blocker set变化、admission/acquired constraints、cancellation observation |
   | Check handoff | started、dependency read request/result、Record report identity/data、callback return/throw/malformed、accepted settlement、outcome/messages/duration |
   | completion | unstarted cancellation closure、aggregate selection/result、progress/machine output status与pre-logging result branch；diagnostic logging自身的close status及其可能触发的final output branch由`RunResult.outputs.diagnosticLogging`和Run diagnostic暴露 |

   Product 直接记录 owner 已形成的参数和结果，不解析 progress/stdout，也不通过 final snapshot 或 transcript timestamp 重建缺失事件。scheduler 只在 blocker set 或状态转换变化时写 entry，避免循环轮询产生没有新信息的重复行。

5. **Check 领域输出保持单一路径。** `CheckExecutionContext`、`CheckPreflight`、package-provided Check 执行与 Check guides 的 authoring contract 不修改。core log 中的 options、Record data、callback result 和 message 是 Product 对实际 handoff 的观察，不是 Check-author 新输出。Package JSDoc 中的 Project Definition 示例可以同步新 output 字段，但不向 Check 增加 logger。需要额外领域信息的 Check 继续使用 final data、supplemental Record 或 terminal message。

6. **repository consumers 明确覆盖默认值。** package default保持关闭；repository quality Definition 显式启用并使用 `.log/project-run`。Project Gate 通过 Run Controls启用，并把 directory设为当前 `.log/project-gate/<invocation-id>`；Product log与 process transcripts位于同一目录。quality/Gate 向调用方显示本次 file或 directory，不增加 `latest`、index或 retention。

7. **logging failure 隔离且不遮蔽已有 output failure。** logger的方法不向调用者抛出；details值本身无法表示时写`details-unavailable`占位并继续，logger实现、create、append或close失败时才把logging永久标为failed并停止普通写入；已打开的writer仍由finalizer best-effort关闭一次，close不得覆盖先前failure。Run/Check、progress和machine publication继续闭合，`RunResult.outputs`保留每项完整status。需要选择唯一`output` diagnostic时沿用现有`progressRendering`、`machinePublication`优先顺序，并把`diagnosticLogging`放在最后，避免排障output遮蔽产品结果output；planning、execution和cancellation branch继续优先于output diagnostic。

8. **通过 Decision 演进接受新增 output。** `add-ephemeral-project-run-diagnostic-logging.md` 以 `修订` 指向 `replace-global-tool-effects-with-run-outputs.md`。successor 保留“Run output必须有明确 consumer/lifecycle”和“cache留在 producing Check”，仅把“两种 outputs”修订为增加本 Change 的一次性 diagnostic logging。

### Resulting Impacts

- Definition/Controls/output validation/status/result/public declaration同步增加 logging；closed-key、defaults、override、path containment和result-priority tests都需覆盖第三项。
- invocation组合 Product-private logger；scheduler、preflight/Check handoff、dependency/Record和completion增加只观察事实的 seam，原 execution/settlement/cancellation owner不变。
- Check callback、preflight、package-provided Check 执行、final data与Record authoring surface保持不变。
- repository logging-on会增加本地IO和时序扰动；性能比较必须明确 logging条件，且 logging-on/off需证明最终运行事实等价。
- machine schema、Check/Record data和progress text不变；未来若需要稳定解析，必须建立新的 machine contract，不能反向提升此人读文件。

### Audit Baseline

Plan 审计以 logging-off 行为作为语义基线；实际命令与执行证据由 tasks 的 Verification 项记录，不把某次运行的计数或 candidate 标识当作产品契约。验收中的 logging-on/off 等价不是逐字节、duration 或并发 wall-clock 相等，而是以下语义事实相同：被选择和执行的 Check、accepted settlement、final data、Records、messages、aggregation、cancellation branch，以及 progress/machine 的既有 status。logging-on成功时只增加日志 I/O 和`diagnosticLogging` status/file；logging-off不得创建 directory、file或writer；logging failure只允许改变`diagnosticLogging` status和既定唯一 output diagnostic选择。

代表性 complete log 应形成下列连续故事；sequence和elapsed的具体值由运行决定：

```text
#000001 +0.0ms run invocation.started validated Project Run started details={invocationId:...,root:...,outputs:...}
#000002 +0.4ms run catalog.check normalized Check catalog entry accepted details={checkId:prepare,...}
#000003 +0.5ms run planning.succeeded normalized task graph was accepted details={checkCount:...,maxParallel:...}
#000004 +0.6ms check:prepare:preflight preflight.continued fallback options accepted details={messages:[...]}
#000005 +0.8ms scheduler check.waiting metrics is blocked details={dependencies:[prepare],mutexes:[],rootBudget:false}
#000006 +1.1ms scheduler check.admitted prepare acquired constraints details={running:1,...}
#000007 +2.3ms check:prepare:execution record.reported supplemental Record accepted details={identity:...,data:...}
#000008 +2.8ms check:prepare:execution check.settled passed result accepted details={outcome:passed,durationMs:...}
#000009 +3.0ms scheduler check.admitted metrics acquired constraints details={dependencies:[prepare],...}
#000010 +4.6ms run aggregation.completed final aggregate selected details={...}
#000011 +5.1ms output:machinePublication output.succeeded machine output closed details={...}
#000012 +5.3ms run invocation.closing pre-logging result selected details={candidateKind:completed}
```

代表性 abrupt interruption 保留没有 final entry 的 partial file；最后一条newline-terminated entry 仍可定位已开始的工作，且不伪造未观察到的 closure：

```text
#000008 +18.1ms check:slow:execution check.started callback handoff started details={...}
<process interrupted; no later complete entry>
```

验证必须同时检查上述语义等价、failure isolation 与 complete/partial 文件特性；具体执行证据由 tasks 的 Verification 项记录。

## Risks / Trade-offs

- **日志量和IO增加：** 外部默认关闭，本仓库明确接受 logging-on成本；第一版不以filter或rotation缩小范围。
- **无法解释Check私有算法：** 这是有意owner边界；core log证明Product handoff与结算，Check-specific新事实由final data/Record/message承接。
- **日志改变时序：** 同步append有意优先保证排障时的partial evidence；sequence只表示logger实际观察顺序，并发、mutex、cancellation和outputs必须在logging-on/off下证明语义结果等价。
- **一次性格式仍可能难读：** representative golden logs必须证明entry局部自足、关联清楚且中断时最后事件可定位。
- **details rendering可能失败：** renderer将无法表示的值写成带原因的占位内容；details失败不得升级为Check或Run execution failure。

## Open Questions

无。外部/仓库默认值、Product-only owner、Check信息路径、日志生命周期、内容范围、failure priority、审计基线和Decision演进均已明确。
