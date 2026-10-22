# Run outputs 全量测试证据审查

## 范围与结论

2026-10-22，逐实体阅读 `run_outputs` 分区 **23 文件、63 实体**的全部正文、参数矩阵及实际 helper；不是抽样。全部文件 SHA-256 与主线程分区清单一致。实体逐项完成记录只保存在 Git 忽略的本地 scratch，不新增提交账本。

**没有已证明可安全整删或合并的实体。** 有一项确定的局部无效断言（RO-L1），一项明确的局部证明不足（RO-R1）；其余三项为局部输入或跨分区覆盖复核，不据此删除现有证据。保留 63 实体不等于宣称所有断言完善或行为已执行通过。

已读取 AGENTS、导航、测试策略、Case 维护、`test-evidence-review`、编码规范，以及 Human output、Run outputs、Project Run 对应 headings、Scheduler measurement/terminal effects、Output maintenance、公开机器输出及两份 current schemas。按分区映射逐项核对以下 Case：

- `WB-DIAGNOSTIC-LOGGING-OUTPUT-001`、`WB-DIAGNOSTIC-FILE-NAMING-001`。
- `WB-PROGRESS-OUTPUT-001`、`WB-OUTPUT-RUN-PROGRESS-001`。
- `WB-OUTPUT-DIRECTORY-TARGETS-001`、`WB-OUTPUT-MACHINE-V4-CONTRACT-001`。
- `WB-RUNTIME-SCHEDULER-PERFORMANCE-DIAGNOSTICS-001`、`WB-RUNTIME-CHECK-DURATION-001`。
- `WB-RUN-RESULT-CHECK-MESSAGES-001`、`WB-PROJECT-DEFINITION-001`。

CodeGraph 已用于定位 renderer、logger、invocation 与 result resolver；随后按明确路径读取实际实现。实际委托材料全部读完：`/workspace/vibe-check/src/project-run/progress-rendering/invocation.test-support.ts`、`/workspace/vibe-check/src/project-run/progress-rendering/renderer.test-support.ts`、`/workspace/vibe-check/src/project-run/execution-control.test-support.ts`，以及 `defineContextCallback` 的原样 descriptor handoff。此分区没有隐藏 child-process 正文；temp directories 与注入 writer/clock/refresh scheduler 的实现均已核对。

## 逐文件普查

表中数字为实际审读实体数；“保留”不豁免下节列出的局部修正。

| 文件（均在 `/workspace/vibe-check/`） | 数量 | 判断与直接证明 |
| --- | ---: | --- |
| `src/project-run/diagnostic-logging/logger.test.ts` | 5 | 保留。真实日志 bytes、安全 hooks 零调用、宽/深/大值、共享序列和独立 channel 故障；长 header 为待复核边界。 |
| `src/project-run/outputs/directories.test.ts` | 3 | 保留。disabled-output grammar 与 public Run 的 parent/absolute 实际 I/O 分层；共享目录精确四文件集合。 |
| `src/project-run/progress-rendering/default-outputs.test.ts` | 1 | 保留。默认开关接线、真实二文件、无 diagnostic 目录、固定 timestamp 与 terminal summary。 |
| `src/project-run/progress-rendering/invocation-diagnostic-data.test.ts` | 2 | 保留。accepted data 不复制；真实同引用依赖消费与 machine/core private marker 排除；更广隐私边界见 RO-X1。 |
| `src/project-run/progress-rendering/invocation-diagnostic-failures.test.ts` | 2 | 保留。scheduler append fault 不损 core/Records；异常返回时 terminal → 两 channel close → progress close 的精确事件序列。 |
| `src/project-run/progress-rendering/invocation-diagnostic-hostile.test.ts` | 1 | 保留。真实 preparation/Record/final-data misuse 经过 containment，hooks 零调用且日志有拒绝证据。 |
| `src/project-run/progress-rendering/invocation-diagnostic-naming.test.ts` | 4 | 保留。完整非法值矩阵、unique/channel、指纹不变、disabled 不建目录、并发/重复 bytes 不变、单 channel collision。 |
| `src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts` | 7 | 保留。异常 close、enabled summary/fingerprint、disabled clock/factory、effects 成功/失败/取消/policy priority；删除或接线 RO-L1 局部断言。 |
| `src/project-run/progress-rendering/invocation-diagnostic-start.test.ts` | 1 | 保留。70 Checks 的 compact start、私有 flag 排除与实际 UTC 文件名；不能以 formatter unit 替代。 |
| `src/project-run/progress-rendering/invocation-output-failure.test.ts` | 3 | 保留。跨 output 故障组合、机器实际文件、terminal-before-close 日志及多失败优先级。 |
| `src/project-run/progress-rendering/invocation-progress-failures.test.ts` | 6 | 保留。禁用、terminal/preview/TTY fault、formatter throw/真实 rejected Promise/hostile thenable、accepted vs rejected Records 均观察最终 facts。 |
| `src/project-run/progress-rendering/invocation-progress-heartbeat.test.ts` | 1 | 保留并补强 RO-R1。当前确证 5 秒 refresh bytes 和一次 cancel，未确证多 Check 下唯一 schedule/最后一次 settlement。 |
| `src/project-run/progress-rendering/invocation-progress-record-previews.test.ts` | 3 | 保留。quiet pass 在 formatter 前省略、完整 readback 与有限 previews、Controls 覆盖及 tee 精确 bytes。 |
| `src/project-run/progress-rendering/invocation-progress.test.ts` | 3 | 保留。真实接线、terminal/file 全文相等、canonical duration/null、文件 setup failure 不吞 terminal。 |
| `src/project-run/progress-rendering/renderer-formatting-color.test.ts` | 1 | 保留。TTY/plain capability 对照、仅 level labels 着色、hostile name/reason 的独立转义期望。 |
| `src/project-run/progress-rendering/renderer-formatting-final.test.ts` | 1 | 保留。零 Check 与逆序结算；精确 bytes 外另有独立 terminal 模型观察最终可见屏幕无 running 残留。 |
| `src/project-run/progress-rendering/renderer-formatting-records.test.ts` | 1 | 保留。独立 Record/message 数量预算、Unicode code points、marker、短预算与空 formatter；canonical 键序输入可补强，见 RO-N1。 |
| `src/project-run/progress-rendering/renderer-formatting-statuses.test.ts` | 2 | 保留。单数 reason group 与四态/null duration/safe reason code；plain hostile text。 |
| `src/project-run/progress-rendering/renderer-formatting-writer-failure.test.ts` | 1 | 保留。renderer 异常直接传播且不隐式重试；“后续事件停写”由 result-priority 的独立 invocation 实体承接。 |
| `src/project-run/progress-rendering/renderer.lifecycle.test.ts` | 5 | 保留。TTY running/settlement order、plain/dumb、六状态 omission 矩阵、atomic detail block、configured/actual 计数分离。 |
| `src/project-run/progress-rendering/result-priority.test.ts` | 4 | 保留。engine failure/cancellation priority、settled writer failure 后无后续 writes、pure resolver 分支与 facts identity。 |
| `src/project-run/progress-rendering/terminal-statuses.test.ts` | 5 | 保留。flags 分组顺序/activation 排除、执行四态呈现中的两个非普通分支、unstarted cancellation 的零调用/facts/not-run。 |
| `src/project-run/progress-rendering/timing.test.ts` | 1 | 保留。两 gated 并行 Checks 的 exact durations 20/35 与 elapsed 40，而非 durations 和 55。 |
| **合计** | **63** | **全部正文与直接委托材料已审。** |

## 可行动的局部候选

### RO-L1 — 删除未接线的“没有 summary”断言，不删除 disabled diagnostics 实体

- 完整实体：`Package Run diagnostic logging output > does not sample Scheduler diagnostics when diagnostic logging is disabled`。
- 位置：`/workspace/vibe-check/src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts:86-119`，具体是 87 行空 `observations` 和 116–119 行断言。
- Owner：`docs/development/scheduler.md#measurement-collector-与-immutable-context`；Case：`WB-RUNTIME-SCHEDULER-PERFORMANCE-DIAGNOSTICS-001`。
- 缺陷：数组没有接入任何 observer，也没有任何 `push`。其 `some(...) === false` 仅证明 fixture 初始为空，无法发现任何真实 summary 泄漏；这不是 callback containment 的问题，而是根本未观察 SUT。
- 现存承接：同实体 101–115 行精确 `clockReads === 2`，以及 diagnostic writer factory 被调用即抛、外层要求 completed，仍能发现禁用时测量/建 writer 的回归；同文件完整实体 `Package Run diagnostic logging output > hands enabled diagnostics to the Scheduler for one terminal human summary` 在 49–81 行实际收集并检查 summary。
- 最小动作：删除该空数组和恒真断言；如确需专门观察 summary absence，须接入真实可观察 seam，不能只加一个空 sink。保留现有 factory/clock tripwires，不减少 Case 目的或实体。

### RO-R1 — 单 Check 与覆盖式 scheduler helper 未证明“唯一 heartbeat / 最后 Check 后取消”

- 完整实体：`Package Run progress rendering outputs > schedules one 5-second TTY heartbeat and cancels it after the last Check settles`。
- 位置：`/workspace/vibe-check/src/project-run/progress-rendering/invocation-progress-heartbeat.test.ts:15-53`；helper：`/workspace/vibe-check/src/project-run/progress-rendering/invocation.test-support.ts:75-94`。
- Owner：`docs/development/project-run.md#run-outputs-and-compatibility-boundary`，细则由 `docs/development/human-output.md#lifecycle-与写入` 定义；Case：`WB-PROGRESS-OUTPUT-001`。
- 缺陷：fixture 只有一个 Check，首个和最后一个 settlement 相同；helper 每次 `schedule` 仅覆盖最后 callback/interval，不计 schedule 次数。因此多次 schedule 后仅取消最后一个 handle，仍可满足当前 interval、一次 refresh 和 `cancellations() === 1`。当前证明有价值，但小于测试名/Case 的 singleton 与 last-settlement 义务。
- 现存承接：该实体 43–53 行直接证明一次有效 5s heartbeat 及 cancel；`Package Run progress rendering outputs > contains a TTY rewrite failure without leaving Check or Record facts open`（`invocation-progress-failures.test.ts:227-274`）证明 refresh fault 后取消和完整 facts，但同样不是多 Check singleton 证据。renderer lifecycle unit 不拥有 schedule 实例数量。
- 最小动作：helper 增加 schedule/active-handle 计数；本实体采用两个独立 gated Checks，首个结算后断言仍未取消、最后后断言一次取消且仅一个 schedule。延续原 Case，不机械拆实体。

## 输入/跨分区复核，非已确认删除候选

### RO-X1 — handoff 隐私的本分区直接观察小于全部 owner 边界

完整实体 `Package Run diagnostic logging output > keeps accepted handoff references out of machine and diagnostic publication`，`/workspace/vibe-check/src/project-run/progress-rendering/invocation-diagnostic-data.test.ts:41-98`；映射 `WB-DIAGNOSTIC-LOGGING-OUTPUT-001`（owner `docs/development/human-output.md#diagnostic-logging-maintenance`）和 `WB-OUTPUT-MACHINE-V4-CONTRACT-001`（owner `docs/output.md#字段与完整集合验证`）。

本实体真实证明 authorized consumer 读取原引用、snapshot outcome 无 handoff、machine run 无字段/私有 marker，以及 **core** 文件无私有 marker。它未读取 scheduler 文件或 `records.ndjson`，也未排除 diagnostic 中只发布 handoff presence/summary metadata 的变体。原引用正确消费使其不是空 fixture，machine/core 检查仍须保留。**这只说明本分区未直接证明这些更广边界，不是全仓缺失结论。** 主线程先向 data/machine、scheduler 分区核对承接；若无对应直接证据，再在原实体读取全部 relevant bytes，并针对 presence facts 作非 Check-ID substring 的精确否定断言。

### RO-X2 — tee 文件 write/close fault 不是 terminal writer fault

完整实体 `Package Run progress rendering outputs > keeps terminal progress when its selected file target cannot be opened`，`/workspace/vibe-check/src/project-run/progress-rendering/invocation-progress.test.ts:66-83`；Case `WB-PROGRESS-OUTPUT-001`，owner `docs/development/project-run.md#run-outputs-and-compatibility-boundary`，terminal-first/file-only failure 细则在 `docs/development/human-output.md#lifecycle-与写入`。

当前真实文件 fixture 确证 setup failure；同文件 `... > tees final progress while retaining canonical Check durations in RunResult`（28–60 行）及 preview Controls 实体确证成功 terminal/file 全文相等。分区内其余 failure writer 注入抛错发生在 **terminal**，不能代替 `/workspace/vibe-check/src/project-run/progress-rendering/presentation.ts:269-289` 的 file close/write catches。**仅标本分区未直接证明，不推断全仓缺失。** 主线程合并反查后，如确无承接，再由输出 owner 选择隔离的 file write/close fault 矩阵；保留 setup failure 与成功双目标证据，不为降低实体数合成泛化 throwing writer，也不单为审计增加生产测试 seam。

### RO-N1 — canonical Record text 的正例 fixture 已预满足键序

完整实体 `Package Run progress Record and message previews > renders independent bounded Record and message previews without changing their source facts`，`/workspace/vibe-check/src/project-run/progress-rendering/renderer-formatting-records.test.ts:26-138`；Case `WB-PROGRESS-OUTPUT-001`，owner `docs/development/project-run.md#run-outputs-and-compatibility-boundary`，preview pipeline 细则在 `docs/development/human-output.md#preview-pipeline`。

30 行 Record `{ a, text, z }` 已按字典序插入，120 行 formatter text 期望使用 `JSON.stringify`。这不是循环调用 Product oracle，但若 renderer 错将 canonical serializer 替换为普通 `JSON.stringify`，当前 fixture 无法区分。该实体的独立 hardcoded escaping、计数、Unicode 截断、空 formatter 与短预算信号都有效，不能整删。最小补强是在既有矩阵加入乱序/嵌套或 numeric-looking keys，使用手写 canonical 字面量核对 formatter 接收正文和实际 preview；无需新 Case。data 层 serializer 单测不独自证明 renderer 使用了它。

### RO-N2 — bounded log 的长 header 旁支，待 owner/动态复核

完整实体 `Project Run diagnostic logger observation formatting > renders bounded filterable facts without changing their format`，`/workspace/vibe-check/src/project-run/diagnostic-logging/logger.test.ts:43-78`；Case `WB-DIAGNOSTIC-LOGGING-OUTPUT-001`，owner `docs/development/human-output.md#diagnostic-logging-maintenance`。

当前逐行 `length <= 200` 观察了大 details 与短 header；`/workspace/vibe-check/src/project-run/diagnostic-logging/observation-rendering.ts` 的 `renderFactLines` 按 facts 分行，但不切 header。合法 Check identity 目前只有非空要求，执行路径将 ID 放入 tag。因此长 Check ID/header 是值得复核的未覆盖输入。**本报告未执行反证，不宣布 Product bug，也不扩范围修实现。** 若 owner 确认 header 同受该物理行预算约束，主线程可在隔离 scratch 用合法长 Check ID 的真实 Run 验证，再决定补边界证据。现有 formatting/escaping/details-bounds 实体必须保留。

## 强制保留与审查边界

- formatter unit 的冻结 context 断言经过 `createProgressRenderer` 直接同步传播，不会被 invocation containment 吞掉。其 expected bytes 大多为独立字面量，不因是 golden output 或矩阵较多就算低价值。
- renderer unit、private invocation 故障接线和 public Run 文件系统证据处于不同边界；不能读 formatter 代表全部输出，亦不能用 schema validator 代替 progress/diagnostic 可见性。`visibleTerminalScreen` 是独立的最小 cursor 模型，不 import Product formatting，保留最终屏幕 oracle。
- 真实 Promise rejection 与 caller-owned `.then`、任意 hostile thenable 的矩阵，证明 rejection 被观察且不读取 author hook；不要因外观相似合并成普通 throw。安全 logger 的 accessor/Proxy/toJSON/cycle/depth/wide/size 也各有不同失败机制。
- terminal/file 全文相等、并发固定 channel 前后 bytes 对照、terminal close 事件序列、muted writer attempts 与 settled facts 都提供真实额外信号。不能把 fake writer 与 filesystem/terminal model 的验证混为一类。
- runtime effect 空 Check fixture直接证明无 work 仍交付 terminal effect；其取消和 policy-failure 实体另有真实 Check/AbortController/policy fault。不能因空 snapshot 判定整个 Hook 证据无价值。

本次只读正文与实现，并进行范围文件哈希检查；**未执行测试正文、Gate、build、install、网络或 Git stage/commit**。主线程已报告的全树 766 entities / 190 Cases registration closure 不在本分区重复执行；该闭合只证明身份/映射，不证明本文语义或正文通过。静态 mutation 推论均明确为待动态验证，尤其 header 与跨分区缺口不构成本报告的已执行反证。除本报告与指定 scratch coverage 外未修改正式文件。
