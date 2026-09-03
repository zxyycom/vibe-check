# 深入理解 Vibe Check API 机制

本文说明 package 的通用 invocation lifecycle：自定义 Check 如何经过 Definition validation、options preflight、execution 与 settlement，以及一次 Run 如何形成 dependency data、aggregation、outputs 和可判别结果。首次集成先阅读[package README](../README.md)；随包 Check 的 options、业务效果和安全边界由各自指南说明；单个 public 字段与函数签名以 installed declarations 为准。

## 一次 Run 的生命周期

以下顺序描述责任与数据流；箭头表示当前阶段成功形成下一阶段的输入：

    ordinary Check values
      │ defineConfig: fill Definition defaults
      ▼
    Project Definition
      │ run: validate Definition + RunControls, then normalize the Check tree
      ▼
    declarative snapshot + fingerprint + complete static graph validation
      │ invocation control barrier: cancellation + normalized flag conditions
      ▼
    initial control settlements + complete static Task graph
      │ Scheduler applies direct relations, mutex and parallel scheduling
      ▼
    task-local preflight / Product-owned blocked unavailable outcomes
      │ admitted Checks continue to author callback
      ▼
    author execution + terminal settlement
      ▼
    snapshot + messages + durations
      │ optional aggregation + enabled output completion
      ▼
    RunResult

Run 在 author work 前验证包含全部可执行 Check 的静态 task graph，再处理 invocation cancellation precedence，并按 Definition 顺序完成 invocation flag control。flag 条件不匹配的 Check 先结算为 `not-applicable / flag-condition-not-matched`，并作为同一张 Scheduler graph 的 pre-admission non-passed Task result；它不会再次 admission，其 `dependsOn` dependent 在 preflight 前结算为 `unavailable / dependency-not-passed`，`observes` consumer 仍可等待并读取该终态。其余 Check 被 Scheduler admission 后在自己的 task 中执行 preflight，随后才执行 author callback；没有互相约束的 preflight 可以并行。Run snapshot 保存 Check facts；progress rendering 呈现 execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files；optional aggregate 也在 terminal facts 结算后计算。

## Definition 与 invocation 的责任

- `defineCheck(value)` 保留 literal `checkId`、options 和 typed-provider parser 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `defineAdmissionPolicy(value)` 只保留 custom admission callback 的 inference；它与同形 inline policy value 等价。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight、execution 与 custom admission callbacks 都保持为执行行为。scheduler fingerprint 只区分 `static` 或 `custom` kind，绝不包含 callback identity、source 或 closure。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

### custom admission policy

`scheduler.admissionPolicy` 省略时与 `{ kind: "static" }` 相同。custom value 以同步
`proposeAdmission(context)` 表达调用方知道、但 Product 不能统一解释的准入偏好；它每轮只返回
`{ kind: "select", taskId }` 或 `{ kind: "wait" }`，没有 reason、reservation、history、identity/version、registry 或 composition
协议。`defineAdmissionPolicy(...)` 只改善该 callback 的 TypeScript inference，inline object 与 helper 的运行语义完全相同。

每次 callback 获得独立、deep-frozen 的 `AdmissionPolicyContext`：`graph` 以 canonical arrays 提供完整 normalized tasks、scopes
及每个 Task 的 relation arrays，Task metadata 是 topology 和 `admissionPriority` 的唯一来源；该 `SchedulerGraphSnapshot` 在 invocation 内一次冻结并由所有 callback 共享。dynamic facts 包含 relation/mutex candidates 的
`{ taskId, canAdmit }`、capacity、running/settled/active-scope IDs、最小 cancellation runtime 状态以及决策边界 measurement。它不是 private Scheduler
inspection 的别名，也不带 `Set`/`Map`、Check options/functions/data、Records、messages、logger、clock、signal 或 Task capability。

callback 是调用方 trusted synchronous code。Product 不 sandbox、timeout、isolate 或为它建立全局 lock；同一 Definition 的
overlapping Runs 共享 caller closure，因此 closure reentrancy 由调用方负责。冻结 context 保护 Product data，不限制 caller
自己的 host-side effects。

Scheduler 在 callback 前形成 candidate，在 callback 后只守下一运行选项的 hard guard：selected Task 必须仍 pending、是当前
relation/mutex candidate、当前 capacity 可 admission 且未越过 lifecycle/cancellation cutoff；`wait` 必须有 running work 能推进下一
snapshot。它不重新判断 policy 是否公平、是否饥饿、是否应选择另一个 candidate 或等待的理由，并独占 readiness、mutex、capacity、
cancellation、Task start、await、blocked settlement 与 terminal settlement。

custom callback 在每次**实际**调用前获得共享、deep-frozen `SchedulerGraphSnapshot` 与 `measurement`：同一 Run 的 graph 只冻结一次，Scheduler 先 flush current open occupancy interval。`cumulative` 只投影 bounded scalar/discrete/peak facts，完整 per-Task table 只属于 terminal raw measurement。`measurementCount` 与 `measurementAt(index)` 构成一次 callback 创建时捕获 end-count 的 synchronous reader：它只返回 index 落在该 immutable prefix 内的 invocation-local append-only frozen action observation，越界返回 `undefined`；它不是 live array 或 per-round slice，因此旧 context 以后调用也不能看到后续 append。每条 observation 描述 accepted `select`/`wait` 的 identity、从其 post-action state 到下一次实际 custom callback 前的 occupancy interval，以及期间 bounded admitted/settled effects；interval 是 state observation，不声明该 action 造成 effects。其 interval 是 closed union：available timing 才包含数值 contribution，unavailable timing 只含 closed reason；所以合法 zero span 是 available zero，而 clock/integral fault 不会被伪造成全零 interval。它不含 actionDuration、causedBy、criticalPath、CPU归因或完整 ledger。连续 select 的第二轮因此能读取首次 select/admission，即使 elapsed 为零；wait 后 settlement 的下一轮仍读取 wait 和完整 running-cohort interval。

即使启用 Scheduler human diagnostics，custom callback 仍不获得 clock、logger、mutable accumulator 或 per-policy timing telemetry；这些 imperative observation 只属于 Scheduler shell，不能成为 callback context、public telemetry 或 policy result。

throw、thenable proposal、malformed proposal、non-candidate/capacity/lifecycle-invalid select 或 undrainable wait 都是 fatal
admission-policy fault：Product 停止新 admission、取消 pending Tasks、drain 已启动 Task，并返回
`{ kind: "execution", diagnostic: { code: "admission-policy-failed" } }`；它不 fallback 到 static policy。启用 diagnostic logging
时只记录有界 fault category 与 Scheduler hard-guard facts，不输出 raw thrown value、proposal、stack 或 caller data，也不建立 policy
console capture、`checkMessages` ownership、timing telemetry、parser/schema 或稳定 event grammar。

## options preflight 与 execution

可执行 Check 可以提供 `preflight(options, signal)`，在 author execution 前准备本次 invocation 使用的 options。authored 与 prepared options 同形时可以直接使用 authored options；两种 shape 不同时，TypeScript 要求提供 preflight。

preflight 返回以下三种 closed result 之一：

| 结果                                                                     | execution 输入与 Check outcome          |
| ------------------------------------------------------------------------ | --------------------------------------- |
| `{ status: "success", preparedOptions, messages? }`                      | 使用 `preparedOptions` 进入 execution。 |
| `{ status: "failure", action: "block", reason, messages? }`              | owning Check 以 `unavailable` 结算。    |
| `{ status: "failure", action: "continue", reason, fallback, messages? }` | 使用 `fallback` 进入 execution。        |

Run 先验证完整 static task graph并完成 invocation flag control；Scheduler 在 direct relation、mutex 与 capacity 允许后 admission 单个未结算 Check，并在该 Check 的 author callback 前执行其 task-local preflight。互不约束的 preflight 可以并行，不形成按 Definition 顺序的全局 preflight barrier。preflight throw、malformed result 或 noncanonical prepared value 把 owning Check 结算为 `unavailable`；其 `dependsOn` dependent 因此不会开始 author work。prepared options 与 fallback 都会成为 detached、deep-frozen 的 invocation-local value；preflight messages 与后续 terminal outcome 共同呈现 preparation 结果。`enabledByFlags` 的公开 authoring grammar 见 [README 的 Check 定义](../README.md#定义-check)。

Package root 的 `defaultProjectFileSelection` 只是 file-selecting constructor 共用的可组合、深冻结 baseline；spread 该
value 不会建立跨 Check global config。部分 constructor 原样物化它，具有更窄文件类型能力的 constructor 从相同
source/exclude 派生精准默认 include；显式 `include` / `exclude` 数组始终由 owning Check 视为完整替换。每项实际默认与
selected-but-rejected 行为由对应 Check 指南说明。

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` / `unavailable` 以 reason 表示本次调用的数据边界。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records。

`messages?` 是 owning Check 可选的有序人读说明；consumer 必须先按 outcome 处理事实，不能用 message presence 推断状态。final data、Records 和 messages 分别承载主要事实、补充事实和人读说明。随包 Check 的额外 message 保证由各自指南说明。

### Check 输出与受管 progress

Check execution 与 Product progress 在调用方的同一个 runtime 中运行。默认 progress 在可用 TTY 上维护临时 running
region，并在同一个 terminal 上移动光标。Product 先完成静态 Check graph 校验，再在任何 author preflight 或 execution
之前安装一次全局 `console.*` router；router 贯穿 invocation flag control、task-local preflight 与 Check execution，所有 Check 闭合后统一恢复原
method descriptors。每个 awaited preflight/execution 只建立独立 async capture context：当前 Check 的调用先进入自己的
内存数组，settlement 后再与该 Check 的 row 连续呈现，并以 `console-<method>` code 保留在
`RunResult.checkMessages`。并发 Check 的数组互不混合；没有 Check capture context 的 host console 调用继续走原方法。

- `console.log` / `info` / `debug` 等普通输出映射为 `info`，`warn` 映射为 `warning`，`error` / `trace` / failed
  `assert` 映射为 `error`。Product 使用非彩色 Console formatting，并在最终 renderer 中转义 terminal controls。
- preflight console 排在 preflight author messages 前；execution console 排在 terminal author messages 前。callback
  随后 throw、取消或返回 malformed result 时，已经捕获的 console 文本仍保留，非法 author message attachment
  仍按原规则整体拒绝。
- 捕获只覆盖通过当前全局 `console` 发起、且属于 callback 已等待 async work 的调用。预先保存的 method reference、
  callback 自行替换全局 console，以及未等待的 floating work 不在可靠归属边界内。
- `process.stdout.write` / `process.stderr.write` 直接写入 process stream，不经过 global console methods，因此绕过 console
  router。Product 不 patch 这些 host-wide streams：它们同时承载 Product、宿主和第三方输出，raw writes 也没有稳定的
  console-call 边界；全局接管会扩大副作用且仍不能可靠覆盖 inherited child-process stdio。直接写入 progress 使用的
  terminal stream 时，文本可能与 TTY cursor update 交错，造成内容被覆盖或遗留 running row。
- 直接 stream write、高容量、流式或 child-process 输出必须写入 Check-owned file、transcript 或独立 logger；不要让它
  继承受管 terminal stream。console capture 不进入 final data、Records、Check facts 或 machine output，也不替代可持久
  诊断材料。

`diagnosticLogging` 默认关闭；调用方显式启用后，`check.finished` diagnostic 会像其它 settled messages 一样包含 captured
console 内容。因此 console 不应写入 secret；只需要内存 readback 时保持 diagnostic logging disabled。

需要稳定补充说明时仍优先在 terminal result 返回结构化 `messages`；console capture 是对常见 author logging 的安全
兼容边界，不是新的 live observer 或 Check logger API。在 `run(...)` 返回后由调用方打印汇总不受 running region 约束。

## Caller-keyed JSON cache

`cacheJsonByKey(...)` 是 package root 的 standalone local-storage helper，不属于 `ProjectDefinition`、`RunControls`、`CheckExecutionContext` 或 Run settlement。调用方提供 absolute `directory`、非空 `namespace`、payload `version`、opaque `key`、同步 `parse` 与同步/异步 `compute`。`key` 必须覆盖所有会改变 computation 结果的输入、实现版本、options、toolchain 与声明的外部状态；helper 不分析依赖，也不判断 key 是否完整。

helper 对固定 API version、namespace、version 和 key 的 canonical structure 计算 SHA-256 identity，并只以 digest 命名 entry。raw key 不进入文件名、envelope、result 或 helper-owned diagnostics。磁盘 entry 在 closed envelope、identity、canonical object payload 与同步 parser 都成功前不可信；只有全部通过才是 hit。miss、invalid payload 或 read failure 后，helper 恰好调用一次 `compute`，并让 computed payload 经过相同的 detached canonical-object/parser boundary。

返回的冻结 result envelope 表示本次调用，而非 Check 结算：hit 为 `{ source: "cache", read: "hit", write: "not-attempted" }`；computed 为 `{ source: "computed", read: "miss" | "invalid" | "failed", write: "stored" | "failed" }`。compute 或 parser failure 直接传播且不写 entry；storage failure 不改变已接受的 computed value，也不自动创建 Check message、Record 或 terminal status。parser 返回的 domain value 由 parser owner 决定是否进一步冻结。

写入在 caller directory 内经 unique temporary file 和 atomic rename 发布。并发 miss 可以重复 computation，但 target 只作为完整有效 entry 读取；helper 不提供 lock、single-flight、global mutable cache、cleanup 或 whole-Check replay。directory 是 caller 信任且可删除的本地 state，不提供 containment、remote sharing、authenticity 或 secret protection；不得将 secret、token 或低熵敏感材料放入 key。consumer 自己决定是否把 observation 转换为 Check 事实。

## Finding presentation

`presentCheckFindings(...)` 是 package root 的通用 presentation helper。它不规定 Finding shape 或完整明细位置；producing
Check 必须提供稳定排序的 `findings`、非负安全整数 `limit`、单条 `message` hook，以及超限时的
`omittedMessage` hook：

```ts
import { presentCheckFindings } from "@zxyycom/vibe-check";

const messages = presentCheckFindings({
  findings,
  limit: 20,
  message: (finding) => ({
    code: "finding-detail",
    level: finding.blocking ? "error" : "warning",
    message: `${finding.path}:${finding.line} ${finding.summary}`,
  }),
  omittedMessage: ({
    omittedCount,
    omittedFindings,
    presentedCount,
    totalCount,
  }) => ({
    code: "findings-omitted",
    level: omittedFindings.some((finding) => finding.blocking)
      ? "error"
      : "warning",
    message: `${omittedCount} more of ${totalCount} findings; inspect reports/my-check.json after the first ${presentedCount}.`,
  }),
});
```

helper 只调用前 `limit` 项的 `message` hook；超限时再调用一次 `omittedMessage`。超限 context 同时给出完整计数和
原 `omittedFindings` references，因此 Check 可以决定省略项等级，并明确告诉 consumer 去 Records、artifact、transcript
或其它实际位置深入查看。返回值只是已冻结 `CheckMessage[]`；Check 仍需把它附加到自己的 terminal result，并自行保存
完整 Finding facts。四项随包质量 Check 使用该通用机制但各自选择 `limit: 10` 和安全字段。

## Finding waiver reconciliation

`reconcileFindingWaivers({ findings, identify, waivers })` 是 package root 提供的独立 helper，供 custom Check 或其它
finding producer 在**完整** finding 候选集合形成后对账。`identify(finding)` 对输入顺序中的每个原 finding 接收完整
finding；调用方自行选择稳定的语义 identity，例如 path、function name 和 metric 的组合。`identify` 的结果与
`waiver.identity` 都必须可安全 materialize 为 canonical JSON，helper 按 canonical JSON 的结构而非对象引用匹配。

每项 waiver 的 identity 必须唯一且 reason 为非空 string。重复 canonical identity、无法 canonicalize 的 finding 或
waiver identity、无效 reason，或 malformed / hostile waiver authoring 都抛出 `TypeError`。每个 configured waiver 都在完整
集合上获得 audit：`0` 次匹配是 `unused`，`1` 次是 `applied`，`>1` 次是 `overmatched`；过宽 waiver 不会豁免任一 finding。

输出 `findings` 保持输入顺序，并在每项结果中保留同一个原 finding reference。applied waiver 附带的 evidence 是 detached、
deep-frozen 的 canonical materialization，因此调用方之后修改 authored identity 或 reason 不会改变结果。helper 只返回
finding disposition 和 waiver audit；它不发布 Record、message 或 terminal outcome。采用它的 Check 自己决定如何发布证据及
如何结算 actionable finding。

随包的 [`fileMetrics`](checks/file-metrics.md)、[`functionMetrics`](checks/function-metrics.md)、
[`duplicateDetection`](checks/duplicate-detection.md) 与 [`secretDetection`](checks/secret-detection.md) 已在各自 options 中原生接入该 helper；它们共享上述 reconciliation，
但 identity、Record、message 与 settlement 仍由各自指南拥有。其它随包 Check 没有自动获得 `findingWaivers` 字段；尤其 `secretDetection` 的 waiver 只能匹配其不含敏感值的安全 identity，不能豁免 coverage gap 或 unavailable。

## 递归组合与继承

带 `execution` 的节点形成自己的 outcome；没有 `execution` 的节点只组织子 Check 和 scheduling scope。普通对象字段表示显式 replacement；`inherit({ add, remove })` 只用于在父 `dependsOn`、`observes` 或 `mutex` collection 上增删。解析后，每个可执行节点拥有自己的 effective options、passed prerequisites、terminal observations、mutexes、visibility、parallel budget 与 admission priority。

## 类型化依赖数据

producer 同时声明 `execution` 与 `parseData`，从而拥有 final-data contract。需要其成功 data 才能工作时，consumer 先声明 direct `dependsOn`，再用非泛型 `dependencies.get(checkId)` 读取 canonical data、收窄 `ok`，最后调用 producer 的 parser。需要在每个 observed upstream 各自结算后，根据任意 terminal outcome 审计或制定 policy 时，改声明 direct `observes`；两类 relation 的 union 才是 dependency reader 的授权范围。

### 完整运行示例

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    const data = changedFiles.parseData(read.data);
    return { status: "passed", data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

dependency reader 为两类 relation union 中、具有 `passed` / `failed` final data 的 direct provider 返回 `ok: true`，并保留 upstream status；其它读取返回包含原因的 `ok: false`。上例的 `dependsOn` 已保证 callback 只在 provider `passed` 后开始，因此它不会把 upstream `failed` 继续传播为自己的结果；`!read.ok` 仍保留为 boundary defense。producer parser 负责 shape、invariant 和 compatibility validation，consumer 显式调用它恢复 provider data。八个随包 Check 都提供 `parseData` 和同实现的 package-root parser；名称与类型见各自指南。

### 批量审计 direct outcomes

当 consumer 需要批量审计自己的全部 direct upstream outcomes，而不是读取一个成功 prerequisite 时，先声明 `observes`，再使用
`dependencies.list()`。它没有参数，返回按 normalized effective direct dependency ID 的稳定顺序排列的冻结
`{ checkId, outcome }[]`；每项及其 Core-owned `outcome` 都是冻结的完整四态 `CheckOutcome`。因此
`not-applicable` 和 `unavailable` 是正常的可观察 terminal facts，不是 `get` 的 read error；两类 relation 各自继承得到的
direct ID 在去重 union 中只出现一次。列表不读取 ambient executed Checks、scheduler history、transitive 或 undeclared Checks。
以下 Check 只能据此形成自己的 summary、I/O、Records、messages 和 terminal result，不能修改、取消、重跑或重结算 producer：

```ts
const auditChangedFiles = defineCheck({
  checkId: "audit-changed-files",
  displayName: "Audit changed files",
  observes: [changedFiles.checkId, analyzeChangedFiles.checkId],
  execution({ dependencies }) {
    const observations = dependencies.list();
    const readable = observations.filter(
      ({ outcome }) =>
        outcome.status === "passed" || outcome.status === "failed",
    );
    const changedFilesObservation = readable.find(
      ({ checkId }) => checkId === changedFiles.checkId,
    );
    if (changedFilesObservation === undefined) {
      return {
        status: "unavailable",
        reason: { code: "changed-files-data-unavailable" },
      };
    }

    const data = changedFiles.parseData(changedFilesObservation.outcome.data);
    return {
      status: "passed",
      data: {
        directDependencyCount: observations.length,
        changedFileCount: data.files.length,
      },
    };
  },
});
```

`list()` observations preserve Core-owned frozen outcomes. `passed` / `failed` data must still be passed to
the producer parser; `not-applicable` / `unavailable` keep their original reason. The owning consumer may
only use the observations for its own I/O, Records, messages and terminal result; it cannot write back to
upstream facts.

## RunControls 与 Check aggregation

`RunControls` 只作用于一次 `run(definition, controls)`：

- `projectRoot` 决定项目相对路径的解析根。
- `flags` 成为 callback 可读的 normalized project context。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `outputs` 覆盖本次 diagnostic logging、machine publication 或 progress rendering。
- `checkAggregation` 选择 `checks`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

Check-specific invocation facts 由 owning Check 的 options 或 producing Check 的 final data 承载。多个 Checks 共享且必须成功的事实时，producer 负责 acquisition policy 与 data shape，下游通过 direct `dependsOn` 读取；需要处理任意 settled outcome 的 policy 则使用 `observes`。上面的 typed dependency 示例聚焦前者 data handoff。

## outputs 与 RunResult 边界

Definition outputs 提供 diagnostic logging、machine publication 与 progress rendering 三项独立 default；RunControls 可以只覆盖当前调用需要的部分。`scheduler.measurementHooks` 不属于这组三项配置：它是 Definition-owned terminal side effect，不能由 RunControls 注入或覆盖。machine publication 与 diagnostic logging 各自的 `directory` 都是受信任调用方选择的非空、无 U+0000 target：relative text 从 effective `projectRoot` 解析，absolute text 直接作为 target；没有 containment 或 sandbox 语义，两个 output 也不因同目录而合并。configuration 成功后的职责如下：

- 只有 diagnostic logging 或 machine publication 至少一项启用时，Run 才在创建 invocation 阶段捕获一次 immutable wall-clock `startedAtUtc`；两项都禁用时不读取或序列化 wall clock。
- 启用的 diagnostic logging 在 preflight 前以该 instant 命名 UTC-compact log path，并按事实形成顺序记录 Product core 已知的 invocation、planning、scheduler、handoff 与 output 时间线。每个事件以序号、单调 elapsed、可筛选的 `[]` 标签和 event name 开始；普通事实使用 `key=value`，超出当前主行容量的事实进入有界 continuation line。标签只突出 Run、Check、phase、Scheduler decision 和 outcome 等高频阅读轴；Scheduler decision 的顶层 `kind` / `taskId` 与 Record observation 的顶层 `result` 已由标签完整表达时，不在 facts 中重复。
- Scheduler evidence 记录本轮 `select`/`wait` 与 hard-guard facts，不记录 policy wait reason、reservation/sticky target、公平/饥饿 state 或 policy timing telemetry。admission-policy fault 只记录有界 category，不能泄漏 callback 原值、stack 或 caller data。
- effective diagnostic logging enabled 时，private Scheduler shell 在实际进入后于 normal、caller-cancelled 或 admission-policy-fault drain 的 terminal path，将有界 `scheduler.summary` internal default Hook 与 caller Hooks 交给同一 ordered runner。summary wrapper 自行包含 writer failure，Scheduler 不作 summary 特调。它分开记录 shell control path、decision observation、slot·ms/capacity ratio、accepted policy wait、admission queue pressure、admission delay 与 tail；clock/integral fault 明确形成 unavailable timing 而不伪造零值，合法 zero span 与之不同。各 projection 允许重叠，不能相加为 wall/CPU/thread/OS utilization；`proposal: null` 的被动 drain 不计 accepted wait。pre-work/planning failure 没有这条 summary，writer failure 也不改写 Run 结果。
- broader graph-ready 只要求全部 directed relations settled；Queue pressure 使用更窄的 admission-viable pending universe：每个 `dependsOn` 必须 `completed`，每个 `observes` 必须 settled，且 Task 仍 pending。即将因 failed prerequisite 走 `settle-blocked` 的 graph-ready Task 不在其中。每个 sampled interval 按 mutex conflict → canonical `canAdmit` false → canonical `canAdmit` true 的顺序互斥分类为 mutex-blocked、capacity-blocked 或 admissible-pending，分别形成 `mutexBlockedTaskMs`、`capacityBlockedTaskMs`、`admissiblePendingTaskMs`；三者之和是 `admissionViablePendingTaskMs`。`peakAdmissionViablePendingTaskCount`、`peakMutexBlockedTaskCount`、`peakCapacityBlockedTaskCount` 与 `peakAdmissiblePendingTaskCount` 是可能来自不同 boundary 的离散峰值，分类峰值不能相加为同一时刻的 total，也不是 decision 计数。top-three `topAdmissionDelays` 中每项的 `mutexBlockedMs + capacityBlockedMs + admissiblePendingMs` 精确构成该项 `admissionDelayMs`；这些事实不推断 policy 的选择理由。
- Tail active set 是最后一次 admission boundary 的逻辑 post-state snapshot，包含此前仍 running 的 Tasks 与新 admitted Task；`discrete.completionTailActiveTaskCount` 保留完整数量，`topCompletionTailContributors` 只保留其中 settlement delta 最大的三个 `{ taskId, settledAfterLastAdmissionMs }`。它解释 last-admission-to-terminal span 的活跃成员，不是 critical path；terminal control/observation 可能使 tail span 大于最大的 contributor delta。`declarativeFingerprint` 原样来自 invocation，只是 declarative-configuration matching signal；它覆盖 normalized declarative Definition，但不包含 `RunControls`、code/candidate/tool/runtime/host、terminal outcome 或 custom callback identity/source/closure。timing unavailable 仍精确保留 fingerprint、admitted count、accepted-wait count、max-running、last-settled Task ID、四个 queue peaks 与 tail active count，但省略不能证明的 task·ms、delay breakdown、tail delta 及其它 time-valued projection。
- 启用的 machine publication 将同一个 instant 投影为 `run.json` 的 `invocation.timestamp`，所以 timestamp 不是 publication 完成时间；两项同时启用时，日志文件名与 machine timestamp 必须共享该一次捕获。
- progress rendering 呈现人读 lifecycle。machine publication、progress rendering、diagnostic logging 与 configured measurement hooks 都由 Run 调度，并分别保留 status；measurement hooks 不因它们与前三项一同 readback 而成为 `outputs` configuration。

这些 diagnostic 行不建立可解析 schema。Run 结束前最后一条可写 diagnostic event 是 `run.terminal-before-log-close`：它只证明 terminal fact 已写入、logger close 尚未确认，随后才尝试关闭日志。

只有 non-configuration `RunResult` 具有有效 output configuration 与 `outputs` readback。此时
`outputs.diagnosticLogging` 的形状为 `{ enabled, status, file }`，其中 `status` 是
`"disabled" | "not-run" | "succeeded" | "failed"`；禁用时 `file` 为 `null`，启用时即使文件创建失败也保留
`path.relative(projectRoot, resolvedFile)` 的预先计算 readback。root 外 target 因此可含 `..`；跨卷时平台可以返回绝对路径。实际 filename 始终是 invocation-specific `run-<UTC 紧凑时间>-<UUID>.log`。无效 Definition、controls 或 aggregation selection 直接返回
configuration diagnostic，不创建诊断日志。

`outputs.measurementHooks` 的形状为 `{ enabled, status }`，使用同一 closed status set。它仅在 normalized
`scheduler.measurementHooks` 为非空时 enabled，并在终态 Hook sequence 前保持 `not-run`；没有 configured Hook 时为
`disabled`。pre-work/planning failure 没有 Scheduler terminal sequence，故 enabled Hook output 仍可为 `not-run`。
在有 terminal sequence 的路径，所有 caller Hooks 成功 settlement 后为 `succeeded`；任一 caller Hook throw/reject 后为
`failed`，但其余 Hook 仍按顺序获得调用机会。内置 `scheduler.summary` writer 不属于此 output。

diagnostic logging 只服务当前人工诊断：它没有 parser、schema/version、跨版本格式兼容、`latest`、retention 或跨 invocation
discovery contract，也不替代 Check final data、Record、terminal message 或 Check/process adapter 自有的 transcript。logging
failure 只把该 output 标为 failed，不改写已形成的 Check/Record facts，也不阻断 progress rendering 或 machine publication 的
闭合。多个 output 都失败时，`RunResult.outputs` 保留每项 status；仅当 primary Run 已正常完成时，`kind: "output"` 依次选择
progress rendering、machine publication、diagnostic logging、measurement hooks 的第一个 failed output。故
`scheduler-measurement-hooks-failed` 表示 Hook output failed 且没有更高优先级的 output failure 被选作 diagnostic；它不覆盖
cancellation 或 execution diagnostic。diagnostic logging 不进入 machine v4；其 machine-field 排除见
[机器输出契约](output.md)。Check final-data parser 只处理已经取得的单个 data object，不替代该契约。

因此 `scheduler.summary` 不进入 `RunResult`、Check/Record facts、machine v4、progress、warning、autotune 或任何 public API；它不获得 parser/schema/version、跨 invocation discovery 或 retention contract，也不是 CPU、memory、thread、process 等 OS telemetry。以后若 fail-fast 或 named-resource capacity 改变 Scheduler capacity/hard guard，必须重新审阅 summary 的 capacity denominator、queue classification、boundary 与 wait 解释，而不是静默重用旧 projection。

progress rendering 在 TTY 中维护 running region，在 plain output 与 `TERM=dumb` 中只追加 settled presentation。invocation flag control barrier 结束时，因 `enabledByFlags` 未匹配而没有启动的 Checks 不逐项呈现完整 settled row；renderer 写一个原因说明块，并按 Definition 顺序列出这些 Checks 的 `displayName`。该分组只识别 Product 形成的 `not-applicable / flag-condition-not-matched`、`durationMs: null` 且无 messages 的事实；preflight failure、dependency blocking、cancellation、其它 `not-applicable` / `unavailable` 和带 messages 的 Check 仍各自呈现。`visibility: "attention"` 继续只隐藏无 author/captured messages 的 passed settled row。两种压缩都不改变 accounting ordinal、outcome、Records、machine output、dependency、aggregation 或 `RunResult`；accepted author message 与 captured console code 都保留在 `RunResult.checkMessages`，终端只呈现 level 与正文。renderer failure 进入对应 output status，不改写已形成的 Check facts。

```text
  The following 2 checks did not run because the run flags did not match their conditions:
    - Deep audit
    - Dependency audit
```

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支                                              | 可用 facts 与处理方式                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `completed`                                       | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。                                                                                                                                                                                                                          |
| `output`                                          | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。`scheduler-measurement-hooks-failed` 只在正常 completion 且 measurement Hooks 是按 output 顺序选中的第一个 failed output 时出现；所有 caller Hooks 已获调用机会且至少一个 throw/reject。已有 cancellation 或 execution failure 时主 result 保留，Hook failure 仅表现为 `outputs.measurementHooks.status: "failed"`。 |
| `cancelled` / `phase: "execution"`                | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。                                                                                                                                                                                                                                                             |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。                                                                                                                                                                                                                                                                          |
| `configuration`                                   | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。                                                                                                                                                                                                                                                 |
| `planning`                                        | task-graph diagnostic 与 invocation metadata。                                                                                                                                                                                                                                                                                          |
| `execution`                                       | Product execution-settlement diagnostic 与 invocation metadata。`diagnostic.code === "admission-policy-failed"` 表示 custom policy 已停止 admission、取消 pending 并 drain started work；它不是 Check terminal status，也不携带 partial snapshot。                                                                                      |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 diagnostic logging、publication 或 rendering failure diagnostic。
