# Design

本文是 `add-check-terminal-messages-and-visibility` 已执行 Plan 的设计记录。它保留形成时冻结的公共 shape、运行时边界、呈现矩阵、实现 seam 和证据闭合方式，供审阅和后续 Change 恢复取舍；不再是实施指令。

## Context

### 权威性与读取顺序

本 Change 已归档，`tasks.md` 的 17/17 项均已完成。本文保留 Plan 形成和实施时的设计记录，不是当前 Product contract；其“形成时”段落也不是当前实现状态。按以下顺序恢复上下文：

1. 当前行为以 [`docs/configuration.md`](../../../docs/configuration.md)、[`docs/quality-metrics.md`](../../../docs/quality-metrics.md)、[`docs/output.md`](../../../docs/output.md) 及相邻源码、测试为准；它们已定义并验证 terminal messages 与 explicit visibility。
2. 长期方向以 [`allow-check-terminal-messages-and-explicit-visibility`](../../../docs/decisions/allow-check-terminal-messages-and-explicit-visibility.md) 为准；它是 `active + aligned`，表示方向与当前实现已核对一致。
3. [`provide-product-owned-check-progress`](../../../docs/decisions/provide-product-owned-check-progress.md) 继续约束 private lifecycle feedback、唯一 progress writer、TTY/plain 分工和 writer failure isolation。
4. 本 Change 拥有形成时的实施 shape、文件责任、任务顺序和验证义务；完成状态以 [`tasks.md`](tasks.md) 为准。当前事实必须回到稳定 owner、源码和测试确认。

### 两个主要问题与衍生问题

1. **主要问题一——Check terminal messages：** 部分 Check 已经拥有安全、可行动的终态提示，但四态 `CheckResult` 没有归属明确、可由 Product 呈现且可由 package caller 读取的消息附件。
2. **主要问题二——Check visibility：** executable Check 无法声明“运行中仍可见，但 passed 且无消息后不保留永久行”的呈现意图。
3. **衍生问题——组合归属：** visibility 不能隐藏已经附带消息的 owning Check；renderer 必须把 settled row 和 messages 作为一个连续 block 输出。

两个主要问题各自具有独立结果和验证义务。消息能力在默认 visibility 下仍有价值；visibility 在没有消息时也能独立减少 supporting Check 的成功输出。

### Plan 形成时的实现 seam

下表记录 Plan 形成时的现状与计划接入点，**不描述当前事实**。所有接入点均已按 `tasks.md` 实施；当前实现以本节前述稳定 owner、源码和测试为准。

| Owner | 形成时事实 | 计划接入点（已实施） |
| --- | --- | --- |
| [`custom-check.ts`](../../../src/product/definition/custom-check.ts) | `CheckResult` 是 closed four-state author return；`Check` 没有 visibility。 | 增加 supporting message declarations、四态可选 `messages` 和 executable Check 的可选 `visibility`。 |
| [`authoring.ts`](../../../src/product/definition/check-tree/authoring.ts)、[`materialization.ts`](../../../src/product/definition/check-tree/materialization.ts)、[`project.ts`](../../../src/product/definition/project.ts) | Definition 使用 closed `CHECK_KEYS`，flatten 后形成 `NormalizedCheckDeclaration` 和 declarative fingerprint。 | 校验、默认化并 materialize visibility；normalized declaration 始终包含显式值。 |
| [`plain-record-values.ts`](../../../src/product/quality-core/check-record/plain-record-values.ts)、[`core-session.ts`](../../../src/product/quality-core/check-record/core-session.ts)、[`canonical-data.ts`](../../../src/product/quality-core/check-record/canonical-data.ts) | Author terminal result 按 `unknown` 进入 descriptor-safe closed validation；非法 result 成为 `invalid-execution-result`。 | Terminal adapter 复用 closed snapshots；Core settlement 额外返回 package-private author-acceptance marker，不把 messages 加入 Core。 |
| [`check-callback.ts`](../../../src/product/run/check-callback.ts)、[`check-execution.ts`](../../../src/product/run/check-execution.ts)、[`result.ts`](../../../src/product/run/result.ts) | Callback raw result 只由 Core 接受；final-snapshot result 返回 canonical facts 和 durations。 | 在 Core 接受 author result 后收集 messages；所有带 final snapshot 的 RunResult 分支返回 canonical `checkMessages`。 |
| [`progress.ts`](../../../src/product/run/progress.ts) | TTY 维护 running region；plain/dumb 只追加 settled rows；human text 统一 escaping。 | Settled feedback携带 validated messages和normalized visibility；renderer按本文矩阵输出一个 owning block。 |
| [`process-check.ts`](../../../scripts/quality/project-gate/process-check.ts) | Nonzero command 已拥有 safe exit/signal/transcript basename，并把 stdout/stderr 留在 transcript。 | Nonzero failure 同时附带一条安全 `command-failed` message，证明真实 Check 按需使用能力。 |

### Plan 形成时的运行时防护审计结论

Messages 采用现有同级 public runtime boundary 的信任模型：

- `snapshotClosedRecord` / `snapshotClosedArray` 要求 plain/null prototype、精确 enumerable data descriptors 和 dense array，拒绝 accessor、symbol、named array property、sparse array 与 reflection failure。
- Core/canonical data 不执行 getter、`toJSON` 或其它 author hook，并 containment Proxy、cycle、custom prototype 与 non-finite values。
- Definition 和 selected Run Controls 同样使用 closed snapshots 或 descriptor-safe parsing；具体 helper 并非全部同构，因此 terminal adapter直接复用最稳健的 snapshot primitives，不复制较弱的数组读取方式。
- 同级 author results、Definition arrays 和 human display strings 在 Plan 形成时没有通用数量或长度配额。因此本 Change 未增加任意 hard cap；若后续出现可测量的资源风险，必须以新的精确配额、失败语义和兼容影响演进 Decision。

## Goals / Non-Goals

### Goals

#### 主要问题一：Structured terminal messages

- 让四态 author `CheckResult` 按需附带 ordered `level` / `code` / `message` items，且 callback 执行期间没有 writer、collector 或 stream side channel。
- 只在 owning Check settlement 时呈现消息；无论 progress 是否启用或 writer 是否失败，accepted messages 都进入 final-snapshot `RunResult`。
- 复用现有 closed runtime validation；非法 attachment 使整个 author result 进入 `invalid-execution-result`，不返回或显示 partial messages。
- 保持 messages 与 CheckOutcome、Core、Records、dependency、aggregation、cache 和 machine v4 的事实边界。

#### 主要问题二：Check visibility

- 让 executable Check 通过 declarative `visibility` 选择默认全显示或 attention-only settled display。
- TTY running row 始终可见；attention 只隐藏 `passed` 且无 messages 的永久 row。
- Hidden row 不改变执行、调度、lifecycle、duration、ordinal、final counts、RunResult、Core、Records、dependency、aggregation 或 machine facts。
- Visibility 进入 normalized declaration 和 Definition fingerprint，使呈现行为变化可由 declarative identity 区分。

#### 衍生问题：Messages 与 visibility 的组合

- 任何非空 messages 都强制显示 owning settled row；row 和全部 messages 使用一次连续 writer call，之后才重绘 TTY running region。

### Non-Goals

- 不提供 live/intermediate feedback、Check-owned writer、buffered collector、stdout/stderr tee、public lifecycle observer、event sink 或 custom renderer。
- 不从 final data、Records、Record ID/count、dependency output、reason 或 transcript 内容自动生成 messages。
- 不把 messages 加入 CheckOutcome、Core、Records、dependency、aggregation、cache 或 machine v4。
- 不让 level 或 visibility 决定 Check outcome、执行、调度、依赖满足、duration 或 final verdict。
- 不在本 Change 交付 durable logs、receipt/event protocol、typed dependency getter、Gate authoring 重构、package documentation 或 registry publish。

## Decisions

### 1. 精确 public authoring shape

Supporting declarations 使用以下精确名称和字面量：

```ts
type CheckMessageLevel = "info" | "warning" | "error";

interface CheckMessage {
  readonly level: CheckMessageLevel;
  readonly code: string;
  readonly message: string;
}

interface CheckResultMessages {
  readonly messages?: readonly CheckMessage[];
}

type CheckVisibility = "always" | "attention";
```

`CheckResult` 的四个现有 branches 分别与 `CheckResultMessages` 相交；`Check` 增加：

```ts
readonly visibility?: CheckVisibility;
```

这些是 public declaration 中的 supporting types，但不增加 package-root named type exports。`CURRENT_PUBLIC_CONTRACT.types` 和 candidate entry 的 named export inventory保持不变；isolated consumer通过 `Check`、`CheckResult` 和 `RunResult` 的结构使用新字段。

`messages` 缺失、own property value 为 `undefined` 或空 dense array 都表示无消息。Items 保留 author order；相同 code 可以重复，不 deduplicate、不排序。

### 2. Message runtime validation 与 Core acceptance

新增 package-private `src/product/run/check-terminal-result.ts`，负责把 raw callback value 安全拆成 existing four-state result 与 detached messages：

1. 使用 `snapshotClosedRecord` 检查 terminal object；allowed keys 按 status 固定：
   - `passed` / `failed`：`status`、`data`、optional `messages`；
   - `not-applicable`：`status`、optional `reason`、optional `messages`；
   - `unavailable`：`status`、`reason`、optional `messages`。
2. 使用 `snapshotClosedArray` 检查 messages；每个 item 必须是 exact closed `{ level, code, message }`。
3. `level` 只接受 `info | warning | error`。
4. `code` 必须是 non-empty string，并匹配与 Check identity 相同的 kebab-case grammar：`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`。Code 只在 `{ checkId, code }` 内解释，不建立全局 registry。
5. `message` 必须是 non-empty string。Product 不 trim、不做 Unicode normalization、不拒绝 whitespace-only content，也不限制 item count 或 string length。
6. Adapter复制并 freeze array/items；string primitives 原值保留。任一 item 非法时，不保留合法 prefix。

Stripped four-state result继续由 Core 唯一验证 outcome/data/reason。`TrustedCheckScope.settle` 的 package-private返回值扩展为：

```ts
interface AuthorCheckSettlement {
  readonly outcome: CheckOutcome;
  readonly authorResultAccepted: boolean;
}
```

`authorResultAccepted` 只在 stripped author result合法且没有 Record diagnostic 覆盖 settlement 时为 `true`。Run 不能通过比较 `reason.code` 推断 acceptance，因为 author可以合法返回同名 code。只有 terminal adapter成功且 `authorResultAccepted` 为 `true` 时，messages才进入 presentation/RunResult；否则 messages为 `[]`，整个 author result沿现有 Core语义成为 unavailable，已经 accepted 的 Records仍按现有规则保留。

Throw、cancellation、prerequisite blocking和其它 Product-created outcomes没有 author messages。合法 messages已经 accepted 后，writer failure不删除它们，也不改写 outcome。

### 3. 精确 `RunResult` readback

`src/product/run/result.ts` 增加 supporting declaration：

```ts
interface CheckRunMessage {
  readonly checkId: string;
  readonly level: CheckMessageLevel;
  readonly code: string;
  readonly message: string;
}
```

所有带 final `snapshot` 的 branches 都增加：

```ts
readonly checkMessages: readonly CheckRunMessage[];
```

具体包括 completed、effect failure 和 execution-phase cancellation；configuration、planning、pre-work/planning cancellation 与没有 final snapshot 的 execution failure不增加该字段。空集显式返回 frozen `[]`。

Run execution按 Check settlement保存 immutable messages；构造 final facts时按 `snapshot.checks` 的 canonical `checkId` 顺序展开，每个 Check 内保持 author order。`checkMessages` 不按并行 settlement顺序排序，因此相同 Definition和author results产生稳定的程序化顺序。Progress feedback继续使用 settlement顺序，两种顺序不互相覆盖。

### 4. 精确 visibility contract

`visibility` 只属于 executable Check：

- omitted或显式 `undefined` 规范为 `always`；显式值只接受 `always | attention`；
- container Check声明 visibility是 invalid Definition，不向 children继承；
- `ParsedCheck`、materialized executable Check和`NormalizedCheckDeclaration`保存该值，normalized declaration始终显式包含 `visibility`；
- omitted和显式 `always`产生相同 Definition fingerprint，`attention`产生不同 fingerprint；
- visibility不进入 Check definition Core fact、machine row、options、Run Controls或invocation-wide progress configuration。

### 5. Settled display matrix 与 renderer 顺序

| Visibility | TTY running row | `passed` + no messages | `passed` + messages | `failed` | `not-applicable` | `unavailable` |
| --- | --- | --- | --- | --- | --- | --- |
| `always` | 显示 | 显示 | 显示 row + messages | 显示 | 显示 | 显示 |
| `attention` | 显示 | 隐藏永久 row | 显示 row + messages | 显示 | 显示 | 显示 |

Plain/dumb terminal没有 running region，但使用同一 settled matrix。Renderer对每个 settled feedback按以下顺序处理：

1. TTY 清除当前 running region；
2. canonical completed count 加一；
3. 从 TTY running collection移除 owning Check；
4. 若 matrix要求展示，format完整 settled block并以一次 `writer.write` 写出；
5. TTY 重绘仍在运行的 rows。

因此 hidden Check仍消耗 ordinal，后续可见行允许从 `[1/3]` 跳到 `[3/3]`。Final summary继续使用全部 outcomes计数。

Settled block精确格式为：

```text
  [<ordinal>/<total>] <displayName> | <status> | <duration-or-not-run> [| <reason-code>]
    [<level>] <message>
```

每条 message一行，按 author order排列。Plain/dumb保留 literal `[info]`、`[warning]`、`[error]`；color-capable TTY只给 level label着色：`info` cyan、`warning` yellow、`error` red，message正文不着色。`code`只进入 `RunResult`，不在终端重复显示。

`displayName`、reason code和message都通过现有 `escapeTerminalText`：newline/carriage return/tab显示为 `\n` / `\r` / `\t`，其它 terminal controls、ESC、U+2028和U+2029使用 uppercase `\uXXXX`。`RunResult.message`保留 validation后的原字符串，不写回terminal escaping。

### 6. Project Gate 的实际使用

Project Gate process Check只在 command具有非零 exit status、transcript已成功写入且即将返回 `failed` 时附带一条 message：

```ts
{
  level: "error",
  code: "command-failed",
  message: `Command exited with code ${status}; signal: ${signal ?? "none"}; transcript: ${basename(logPath)}.`
}
```

同一 Check继续提交现有 `command-failure` Record；message由 producing Check从同一安全 facts显式构造，不由Product从Record自动投影。Passed、not-applicable、pre-start cancellation、spawn/exit unavailable和transcript write failure在本 Change中不附带message。stdout、stderr、完整路径、command args、credential URL、digest和transcript内容都不得进入message或`RunResult.checkMessages`。

### 7. Test evidence 审计与闭合方式

Plan 形成时的 `bun run test-evidence -- check --root .` 证明当时 `140` 个 Bun 实体由 `44` 个 semantic Cases 完整覆盖。账本只描述已实现事实，因此 Plan 没有预建空 Case；实施按下表的闭合方式同步测试实体和 Case。

| 行为义务 | 形成时 Case | 已完成的证据闭合方式 |
| --- | --- | --- |
| Visibility Definition validation、default normalization与fingerprint | `WB-PROJECT-DEFINITION-001` | 已扩展 `project.test.ts` 实体并更新该 Case 的 Entities/Proves。 |
| Invalid/hostile message attachment containment与accepted Records保留 | `WB-RUNTIME-CHECK-FAILURE-001`、`WB-RUNTIME-CHECK-LIFECYCLE-001` | 已扩展 adversarial matrix；测试身份变化同步更新 Entities，正文变化重新审阅 Proves。 |
| Accepted messages进入 final-snapshot `RunResult`且canonical排序 | 无独立 Case | 已新增由 `docs/configuration.md#invocation-and-results`拥有的 `WB-RUN-RESULT-CHECK-MESSAGES-001`，仅在真实测试实体落地后建立。 |
| Progress-disabled/writer-failed仍保留messages | `WB-PROGRESS-EFFECT-001` | 已扩展 invocation/result-priority evidence并同步 Proves。 |
| TTY/plain message block、colors、escaping、attention matrix与ordinal | `WB-RUNTIME-PROGRESS-PRESENTATION-001`、`WB-OUTPUT-RUN-PROGRESS-001` | 已扩展 renderer entities和两个 owner视角的 Proves，未按矩阵行机械拆 Case。 |
| Project Gate safe `command-failed` message与transcript防泄漏 | `AUX-PROJECT-GATE-PROCESS-001` | 已修改 nonzero-exit entity正文并同步 Proves，未为同一流程新增 Case。 |
| Installed public declarations、checkMessages readback与默认 progress | `AUX-PACKAGE-CANDIDATE-001` | 已扩展 isolated-consumer entity和 Proves，并确认不增加 named type root。 |

完成后的 `bun run test-evidence -- check --root .` 证明 `144` 个 Bun 实体由 `45` 个 semantic Cases 闭合，其中 `WB-RUN-RESULT-CHECK-MESSAGES-001` 是上述 `RunResult.checkMessages` 的独立 Case。任何后续新增、删除、重命名、拆分、合并或正文修改仍须按 `test-evidence-review`执行前后全树check，并运行最窄目标tests。Case按owner契约和observable result划分，不按新增test数量机械拆分。

### 8. 实现文件责任与顺序

| 顺序 | 文件责任 | 完成出口 |
| --- | --- | --- |
| 1 | `custom-check.ts`、public contract fixtures | Types表达精确 authoring shape且named root inventory不扩大。 |
| 2 | `authoring.ts`、`materialization.ts`、`project.ts` | Visibility closed validation、default、normalization与fingerprint闭合。 |
| 3 | 新 `check-terminal-result.ts`、`core-session.ts`、`check-execution.ts` | Raw attachment安全拆分，Core acceptance marker控制messages commit。 |
| 4 | `result.ts`、`invocation.ts`及execution cancellation/effect result builders | 每个final-snapshot branch返回canonical frozen `checkMessages`。 |
| 5 | `progress.ts`及effect handoff | 一次settled-block write、matrix、colors、escaping与writer isolation闭合。 |
| 6 | `process-check.ts` | Nonzero failure附带唯一批准的安全message。 |
| 7 | 稳定owner、candidate declarations、isolated consumer与Case账本 | Contract、实现、public artifact和证据使用同一shape。 |

## Risks / Trade-offs

| 风险或取舍 | 控制与验证 |
| --- | --- |
| Messages演变成第二套quality facts | Level只控制presentation，code只在owning Check namespace解释；不进入Core/Record/machine/policy。 |
| Invalid item只被静默丢弃 | Attachment完整snapshot后再commit；任一非法项令author result unavailable，零条partial messages逃逸。 |
| Author合法使用`invalid-execution-result` code被误判 | Core返回独立`authorResultAccepted` marker；Run不比较reason code猜测acceptance。 |
| 大量或很长messages增加内存/terminal输出 | 本 Change与同级author result一致不设任意hard cap；writer failure isolation保持。出现测量证据后演进Decision。 |
| Writer failure删除程序化messages或改写outcome | `checkMessages` collection与progress effect分离；writer failure只标记effect failed。 |
| 控制字符伪造行或TTY cursor | 所有human text复用统一escaping；`RunResult`保留原validated string。 |
| Attention隐藏运行中或非成功Check | TTY running始终显示；settled matrix只隐藏passed+no-message。 |
| Hidden row造成ordinal跳号 | canonical counter/total不受display过滤影响；tests和Output owner说明跳号语义。 |
| Gate泄漏child output或敏感路径 | 只允许exit code、signal和transcript basename；防泄漏fixture拒绝stdout/stderr/完整路径。 |
| Visibility被误用为execution optimization | Visibility只进入declarative identity与private presentation；facts、execution和accounting不变。 |

## Open Questions

无。Public names、level/color mapping、code grammar、validation、RunResult layout/order、visibility default/fingerprint、renderer matrix/order、Project Gate message和test evidence closure均已冻结。任何实施中发现的必要偏离都必须先更新本 Design与长期 Decision，并重新取得会受影响的用户审阅；不得作为局部工程细节默认落地。
