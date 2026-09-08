# 深入理解 Vibe Check API 机制

本文说明 package 的通用 invocation lifecycle：自定义 Check 如何经过 Definition validation、options preflight、execution 与 settlement，以及一次 Run 如何形成 dependency data、aggregation、outputs 和可判别结果。首次集成先阅读[package README](../README.md)；随包 Check 的 options、业务效果和安全边界由各自指南说明；单个 public 字段与函数签名以 installed declarations 为准。

## 按任务阅读

- 需要定义项目规则、选择 `preflight` / `execution`、读取 callback context、处理依赖或取消时，阅读[编写会正确结算的自定义 Check](guides/extending-check-lifecycle.md)。
- 需要为多个 Check 定义选择偏好、比较假设分支、使用 prepared strategy 或 learned history 时，阅读[按项目约束调度 Check](guides/scheduling.md)。
- 本页解释这些公开能力在一次 Run 中怎样衔接，以及 dependency data、aggregation 与 outputs 的共同结果模型；按任务的 authoring 与 scheduling 细节分别位于上述指南。

## 一次 Run 的生命周期

以下顺序描述责任与数据流；箭头表示当前阶段成功形成下一阶段的输入：

    ordinary Check values
      │ defineConfig: fill Definition defaults
      ▼
    Project Definition
      │ run: validate Definition + RunControls, then normalize the Check tree
      ▼
    validated Definition + complete static graph
      │ before execution: apply cancellation and flag selection
      │ prepared admission strategy readies one Run-local decision function when configured
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
      │ terminal measurement Hooks settle; if terminal context exists, prepared strategy completes once
      │ optional aggregation + enabled output completion
      ▼
    RunResult

### Selection 与 Scheduler readiness

Run 在 author work 前验证包含全部可执行 Check 的静态 task graph，再处理 invocation cancellation precedence。graph 有效时，flag control 从同一次 private effective selection 结算：direct selection 包含无 flag Check 与 predicate-matching flag Check；只有 matching root author 以 literal `propagateDependsOn: true` opt-in 时，才额外加入其 normalized `dependsOn` 传递闭包，省略字段仍保持 direct-selection compatibility。closure 不访问 `observes`，并覆盖 dependency 自身 predicate miss；因此 dependency-activated Check 不会结算为 flag disabled。

effective selection 外的 predicate miss 才先结算为 `not-applicable / flag-condition-not-matched`，并作为同一张 Scheduler graph 的 pre-admission non-passed Task result；它不会再次 admission，其 `dependsOn` dependent 在 preflight 前结算为 `unavailable / dependency-not-passed`，`observes` consumer 仍可等待并读取该终态。flags 只是 selection input，不是权限或环境准入；hard condition 仍由 Check-owned preflight/execution 结算。

### 并发约束

用 `mutex` 为需要互斥执行的 Task 声明同一个逻辑组名称；同一互斥名称下，同一时刻最多运行一个 Task。`maxParallel` 限制 slot 数量；`resourceClaims` 按 units 占用已声明的 named resource。这三类约束与 relations 一起由 Scheduler 重检，admission policy 只提出选择，不改变这些约束。

### Task-local preflight 与 execution

其余 Check 被 Scheduler 在 direct relation、mutex 与 capacity 允许后 admission，并在自己的 task 中执行 preflight，随后才执行 author callback。没有互相约束的 preflight 可以并行；它们不构成 Definition 顺序的全局 barrier。

### Terminal snapshot、aggregation 与 outputs

Run snapshot 保存 Check facts；progress rendering 呈现 execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files；optional aggregate 也在 terminal facts 结算后计算。

对 prepared custom strategy 而言，graph ready 后 `prepare` 每次 Run 最多形成一个 Run-local `decide`；Scheduler 可以同步调用它零次或多次。Scheduler 结束 admission、等待已启动工作并形成 terminal measurement 后，先交付 generic `measurementHooks`，再在存在 terminal context 时调用可选 `complete`。不能形成 terminal measurement 的早期执行失败不会调用 `complete`；`complete` 只能处理终态观察，不能回写同一 Run 的选择或 Check 结果。实际 authoring 见[调度专题](guides/scheduling.md#已准备的-custom-strategy)。

## Definition 与 invocation 的责任

- `defineCheck(value)` 保留 literal `checkId`、options 和 typed-provider parser 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `defineAdmissionPolicy(value)` 只保留 closed admission policy literal、特别是 custom strategy 的 inference；它与同形 inline policy value 等价。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight、execution 与 custom admission callbacks 都保持为执行行为。scheduler fingerprint 区分 `static` 与 `custom`，且不包含 callback identity、source 或 closure。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

### custom admission policy

`scheduler.admissionPolicy` 省略时使用 `{ kind: "static" }`。custom policy 的 `simple` 与 `prepared` form、`decide` 可读事实、proposal 限制、失败和 cancellation 边界，见[按项目约束调度 Check](guides/scheduling.md#自定义准入-policy)。这里保留共同 lifecycle 关系：policy 只能提出选择，Scheduler 仍拥有 relation、mutex、容量、取消、Task 启动和结算的 guard。

### AdmissionGraph simulation

`createAdmissionGraph(...)` 是独立静态图的 immutable hypothetical simulation，不运行或控制真实 Check。输入 graph 的 named resource capacities/claims 使用 canonical `{ resourceId, units }[]`；successor inspection 投影当前 `{ capacity, inUse, available }`，但不提供 reservation 或真实资源 handle。如何建立分支、读取 successor 以及它不包含什么，见[调度专题的 AdmissionGraph](guides/scheduling.md#模拟-admissiongraph)。真实 Run 的 callback 仍只提交 proposal，随后由 Scheduler 重检 relation、mutex、root/scoped 和 named-resource guards。

### learned critical-path strategy

`createLearnedCriticalPathStrategy(options)` 返回普通 public prepared custom strategy；将它放入
`scheduler.admissionPolicy: { kind: "custom", strategy }`。它遵循与其它 prepared strategy 相同的 prepare、decision
measurement 和 terminal complete lifecycle；Scheduler 仍会重检其 `select` proposal 的 relation、mutex、capacity 与取消
guard。它不创建 Product 专属 diagnostic channel、output status 或 `RunResult` field。完整 factory 用法、history 安全
边界、退化、observation contract 与项目测量边界见
[调度专题](guides/scheduling.md#learned-critical-path-strategy)。

## options preflight 与 execution

可执行 Check 可以提供 `preflight(options, signal)`，在 author execution 前准备本次 invocation 使用的 options。authored 与 prepared options 同形时可以直接使用 authored options；两种 shape 不同时，TypeScript 要求提供 preflight。

preflight 返回以下三种 closed result 之一：

| 结果                                                                     | execution 输入与 Check outcome          |
| ------------------------------------------------------------------------ | --------------------------------------- |
| `{ status: "success", preparedOptions, messages? }`                      | 使用 `preparedOptions` 进入 execution。 |
| `{ status: "failure", action: "block", reason, messages? }`              | owning Check 以 `unavailable` 结算。    |
| `{ status: "failure", action: "continue", reason, fallback, messages? }` | 使用 `fallback` 进入 execution。        |

Run 先验证完整 static task graph并完成 invocation flag control；Scheduler 在 direct relation、mutex 与 capacity 允许后 admission 单个未结算 Check，并在该 Check 的 author callback 前执行其 task-local preflight。互不约束的 preflight 可以并行，不形成按 Definition 顺序的全局 preflight barrier。preflight throw、malformed result 或 noncanonical prepared value 把 owning Check 结算为 `unavailable`；其 `dependsOn` dependent 因此不会开始 author work。prepared options 与 fallback 都会成为 detached、deep-frozen 的 invocation-local value；preflight messages 与后续 terminal outcome 共同呈现 preparation 结果。`enabledByFlags` 的公开 authoring grammar 见[按 flag 选择 Check](guides/extending-check-lifecycle.md#按-flag-选择-check)。

Package root 的 `defaultProjectFileSelection` 只是 file-selecting constructor 共用的可组合、深冻结 baseline；spread 该
value 不会建立跨 Check global config。部分 constructor 原样物化它，具有更窄文件类型能力的 constructor 从相同
source/exclude 派生精准默认 include；显式 `include` / `exclude` 数组始终由 owning Check 视为完整替换。每项实际默认与
selected-but-rejected 行为由对应 Check 指南说明。

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` / `unavailable` 以 reason 表示本次调用的数据边界。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records。

`messages?` 是 owning Check 可选的有序人读说明；consumer 必须先按 outcome 处理事实，不能用 message presence 推断状态。final data、Records 和 messages 分别承载主要事实、补充事实和人读说明。随包 Check 的额外 message 保证由各自指南说明。

### Check messages 与受管 progress

Check 在 terminal result 中返回有序的 `messages`；它们是人读补充信息，consumer 仍先按 outcome 处理 final data 和 Records。启用 progress rendering 后，每个 settled row 默认最多预览五条 Records 与五条 messages，且每条正文默认最多 240 个 Unicode code points；两个数量必须为非负 safe integer，文本预算必须为正 safe integer，Definition 或本次 Run 可独立改变它们。`0` 只隐藏该类 detail，仍显示准确 omitted count；短预算时 `… [truncated]` 只保留放得下的 marker 前缀。accepted Records 与 final data 是 Check facts，按各自的 `RunResult` / machine contract 保留，messages 则保留在 `RunResult.checkMessages` 供人读。renderer 的截断、formatter 或关闭不会改写它们。

在 callback 已等待的异步工作中通过全局 `console.*` 发出的文本，会作为该 Check 的 `console-<method>` messages 呈现。它适合短的人读诊断：不要向 console 写入 secret，也不要依赖 progress 文本保存完整事实。`process.stdout.write`、`process.stderr.write`、流式或 child-process 输出应写入 Check-owned file、transcript 或独立 logger；这些输出不具有可靠的 Check 归属，直接写入受管 terminal 也可能与 progress 交错。需要稳定补充说明时，在 terminal result 返回结构化 `messages`。

#### 配置 preview 文本

需要在终端中保留长文本的前后片段时，把同步 `formatter` 写进 Definition。它接收冻结的 `{ kind, text, maxCodePoints }`：`kind` 是 `"record"` 或 `"message"`，`text` 是选中项未转义、未截断的默认正文（Record 为 local ID 加 canonical JSON，message 为正文），`maxCodePoints` 是当前文本预算。Product 仅对数量限制内的项调用一次，先 Records 后 messages；返回值仍由 Product 转义并限长。如下例把长文本折叠为头尾片段，并在本次 Run 单独缩小 Record 数量：

```ts
import {
  defineCheck,
  defineConfig,
  run,
  type ProgressPreviewFormatter
} from "@zxyycom/vibe-check";

const headAndTail: ProgressPreviewFormatter = ({ text, maxCodePoints }) => {
  const points = [...text];
  if (points.length <= maxCodePoints) return text;
  const tailLength = Math.max(1, Math.floor(maxCodePoints / 3));
  const headLength = Math.max(0, maxCodePoints - tailLength - 1);
  return `${points.slice(0, headLength).join("")}…${points.slice(-tailLength).join("")}`;
};

const detail = defineCheck({
  checkId: "detail",
  displayName: "Detail",
  execution: ({ records }) => {
    records.report({ id: "long-detail" }, { text: "a verbose diagnostic value" });
    return { status: "passed", data: {} };
  }
});

const definition = defineConfig({
  checks: [detail],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { formatter: headAndTail, textPreviewCodePointLimit: 48 }
  }
});

const result = await run(definition, {
  outputs: { progressRendering: { recordPreviewLimit: 1 } }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

文本预算只限制转义后的 preview 正文（含截断 marker），不包含缩进、label、换行、汇总或省略提示；Unicode code points 不等于终端列宽或 graphemes。

formatter 返回空字符串仍是一条呈现项；throw 或返回非字符串（包括 Promise/thenable）只使 `outputs.progressRendering` failed，不回退默认文本，也不改变 Check/Record/message facts。它是 trusted project code：可见完整默认文本，不能把预算当成 redaction/access control，Product 不 sandbox 其独立 I/O 或 detached work。`formatter: null` 可在 RunControls 明确清除 Definition formatter；省略或 `undefined` 不覆盖。Definition 的数值与 formatter 种类参与 declarative fingerprint，但函数 identity/source/closure 以及 RunControls 覆盖均不参与；`RunResult.outputs.progressRendering` 继续只读回 enabled/status。

### Progress rendering

TTY 使用可更新的 running region；plain output 与 `TERM=dumb` 只追加 settled presentation。每个可见 settled row 保留 measured duration 或 `not run`；完整、canonical-ordered `RunResult.checkDurations` 仍保留所有 Check，未执行项为 `null`。`visibility: "attention"` 只隐藏既无 accepted Record 也无 author/captured message 的 passed settled row，不隐藏 running Check。

flag control barrier 结束后，因 `enabledByFlags` 未匹配而未启动的 Checks 以一个原因块分组呈现，而非逐项 settled row；dependency activation 带入的 Check 不在该组。两种显示压缩都不改变 Check facts、accounting 或结果。配置 `progressLogFile` 时，同一 rendered bytes 先写 terminal、再写 file；file setup/write/close failure 使 progress output failed，但不吞掉 terminal presentation。

### Finding message presentation

producing Check 可用 `presentCheckFindings(...)` 从完整 Finding facts 形成有限的 terminal messages。输入、omission summary、完整明细位置与随包 Check 的采用见[呈现 Check Finding](guides/presenting-findings.md)。

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
- `checkArtifactBaseDirectory` 是可选、invocation-only 的 Check artifact base；它使用非空且无 U+0000 的受信任 directory grammar，relative text 从 effective `projectRoot` 解析，absolute text 直接作为 target。它不进入 Definition fingerprint，不创建 output status，也不授予 Check 读取 base、sibling directory、machine/diagnostic output 或 cross-Run state 的能力；没有配置时 callback 的 `artifactDirectory` 为 `null`。
- `progressLogFile` 是可选、invocation-only 的 terminal-progress tee target，使用同一非空且无 U+0000 target grammar；它不会改变 Definition outputs、Definition fingerprint 或 Check callback capability。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `outputs` 覆盖本次 diagnostic logging、machine publication 或 progress rendering；progress 的数量、文本预算与 formatter 按字段覆盖，`0` 有效，`formatter: null` 清除 Definition callback，省略/`undefined` 不覆盖。
- `checkAggregation` 显式选择 `checks: "all"`、Check-ID list 或 `"effective"`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。`"effective"` 只复用本次 private flag-and-dependency selection；`"all"` 和 ID list 不模拟或修改它。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。`"effective"` 的 empty selection 仍由 caller `empty` policy 结算，且不会把 private selection projection 到 `RunResult`、machine、diagnostic 或 callback。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

Check-specific invocation facts 由 owning Check 的 options 或 producing Check 的 final data 承载。多个 Checks 共享且必须成功的事实时，producer 负责 acquisition policy 与 data shape，下游通过 direct `dependsOn` 读取；需要处理任意 settled outcome 的 policy 则使用 `observes`。上面的 typed dependency 示例聚焦前者 data handoff。

## outputs 与 RunResult 边界

Definition 分别配置 diagnostic logging、machine publication 与 progress rendering；`run(..., { outputs })` 可只覆盖本次 invocation 的其中一项。machine publication 与 diagnostic logging 的 `directory` 都是调用方选择的非空、无 U+0000 的受信任 target：相对路径从 effective `projectRoot` 解析，绝对路径直接使用；它们不提供 containment 或 sandbox 语义。`scheduler.measurementHooks` 是 Definition-owned terminal side effect，不能由 RunControls 注入或覆盖；它只交付 caller 配置的 generic Hooks 与 prepared strategy 的 public `complete`，`scheduler.summary` 则属于 diagnostic logging。

- **machine publication** 在 terminal snapshot 形成后写入 machine files。需要由工具消费的稳定数据时，读取 [机器输出契约](output.md) 与 Check facts。
- **progress rendering** 呈现人读 lifecycle；可选 `progressLogFile` 镜像相同的 terminal presentation。它不改变 Check execution、settlement 或完整 facts；`RunResult.outputs.progressRendering` 继续只读回 `{ enabled, status }`，不公开 preview 文本、effective limits 或 formatter。
- **diagnostic logging** 为当前 invocation 写入人工诊断。它用于关联 Run、Check、phase 与 Scheduler 行为；日志不是 parser/schema、跨 invocation discovery 或 retention contract，也不替代 Check final data、Record 或 message。

启用 diagnostic logging 时，scheduler channel 可给出本次 Run 的 `scheduler.summary`：它帮助解释 admission、等待、capacity 与 tail 的当前诊断投影。time 与 capacity 指标只描述 Scheduler 行为，不表示 CPU、memory、thread 或 process 的 OS utilization；需要 machine-readable 结论时，仍读取 machine output 和 Check facts。

只有 non-configuration `RunResult` 具有有效 output configuration 与 `outputs` readback。每项 status 使用 `"disabled" | "not-run" | "succeeded" | "failed"`；`outputs.diagnosticLogging` 的形状为 `{ enabled, status, channels }`，其中 `channels` 是 `core`、`scheduler` 的 `{ enabled, status, file }` map。禁用 channel 的 `file` 为 `null`；启用 channel 即使创建文件失败也保留预先计算的 `path.relative(projectRoot, resolvedFile)`，因此 root 外 target 可含 `..`，跨卷时平台可以返回 absolute path。任一 enabled channel failed 时 aggregate status 为 `failed`，只有全部 enabled channel succeeded 时为 `succeeded`。

`outputs.measurementHooks` 的形状为 `{ enabled, status }`：

| 条件 | `enabled` / `status` |
| --- | --- |
| normalized `scheduler.measurementHooks` 非空，或 successful prepared strategy 实际提供 `complete` | `enabled: true`。 |
| 两者都没有 | `enabled: false`，`status: "disabled"`。 |
| enabled Run 没有 sealed terminal sequence | `status: "not-run"`。 |
| sealed sequence 中所有 generic Hooks 与可选 public `complete` 都成功 | `status: "succeeded"`。 |
| 任一 generic Hook 或 `complete` throw/reject | `status: "failed"`；后续 `complete` success 不会覆盖已记录的 generic failure。 |

channel setup、write 或 close failure 只使对应 output failed，不改写已经形成的 Check/Record facts，也不阻断其它 output 结算。

当 primary Run 已正常完成时，output failure 使结果成为 `kind: "output"`；多个 failure 依次选择 progress rendering、machine publication、diagnostic logging、measurement hooks 的第一个作为 diagnostic。`scheduler-measurement-hooks-failed` 因而只表示 measurement hook 是按该顺序选中的 failure；cancellation 或 execution diagnostic 保持原有 primary result，hook failure 仍在 `outputs.measurementHooks.status` 可见。

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支 | 可用 facts 与处理方式 |
| --- | --- |
| `completed` | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。 |
| `output` | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。 |
| `cancelled` / `phase: "execution"` | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。 |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。 |
| `configuration` | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。 |
| `planning` | task-graph diagnostic 与 invocation metadata。 |
| `execution` | Product execution-settlement diagnostic 与 invocation metadata。`diagnostic.code === "admission-policy-failed"` 表示 custom policy 已停止 admission、取消 pending 并 drain started work；它不是 Check terminal status，也不携带 partial snapshot。 |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 output failure diagnostic。
