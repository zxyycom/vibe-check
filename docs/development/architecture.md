# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
                    ├─ invocation-wide flag control barrier
                    ├─ Scheduler admission + task-local Check preflight
                    ├─ Check direct execution / blocked-dependent settlement
                    └─ frozen Check facts → optional aggregation / publication / outputs / RunResult
```

当前实现是 <code>src/project-run/run.ts</code> 的 <code>run(ProjectDefinition, RunControls)</code>，并由 <code>src/index.ts</code> 作为唯一 public package entry 导出。项目拥有 TypeScript Definition 和绑定它的 Run wrapper；Product 不拥有项目模块路径、配置发现或重新加载。

## Source module boundaries

`src/` 的 Product module 按以下 owner 划分：

- `src/check/**` 拥有 ordinary Check contract、Definition/identity validation 与 options snapshot；
- `src/check/finding-presentation.ts` 提供由 Check owner 配置上限和格式化 hook 的通用 Finding message
  投影；它不拥有 Finding facts 或明细位置；
- `src/project-definition/**` 拥有 Project Definition tree、defaults、validation、normalization 与 fingerprint；
- `src/check-settlement/**` 拥有 terminal Check/Record facts、session、store 与 fact validation；
- `src/project-run/**` 拥有 Run entry、aggregation、project context 与 result；其下级 owner 见
  [Project Run child owners](#project-run-child-owners)；
- `src/machine-output/v4/**` 拥有从 Check facts 向 versioned machine artifacts 的 publication；
- `src/cache/**` 拥有 caller-keyed canonical JSON object 的 identity、untrusted disk envelope、read/compute/write observation 与 atomic local publication；它不拥有 caller key correctness、payload domain 或 Check adoption；
- `src/finding-waivers/**` 拥有按调用方语义 identity 对账 finding waiver 的公开纯函数；它不发布
  Record、不决定 Check outcome，也不依赖 Core 或 Gate；
- `src/package-checks/<check-owner>/**` 拥有 package-provided ordinary Checks 与 Check-owned scanners；其同级 `project-files/**`、`host-environment/**` 是该 delivery owner 的真实共同能力；
- `src/package-checks/function-metrics/analyzer/**` 是 function-metrics Check 私有的 source-aligned Lizard port；其
  实作边界见 [Function-metrics analyzer](#function-metrics-analyzer)；
- `src/data-boundary/**` 拥有 canonical JSON/data、closed-value snapshot 与跨 core owner 的 type guards；
- `scripts/docs/package-api/**` 拥有 package、文档与 candidate tooling 共用的 public-root inventory。

生产依赖方向由 `src/index.ts` 组合 public roots；Project Definition 与 Check facts 不相互依赖，二者都只依赖
ordinary Check contract。task scheduler 只是 Run 的 private child，不形成第二个顶层产品模块。源码不为这些模块额外建立
`index.ts` barrel 或 compatibility re-export。

### Learned critical-path helper owner

`src/learned-critical-path/**` 拥有 exported `createLearnedCriticalPathStrategy(...)` 与其 caller-owned duration-history model：factory 验证调用方提供的绝对 state directory、identity projection 和有界 model controls，在普通 public prepared-strategy lifecycle 中准备 immutable prediction/critical-path selection closure，并在 terminal Hooks 完成后记录下一次 Run 可用的样本。它不读取 Product options、flags、project root 或 diagnostic channels，也不改变 Scheduler 的 legality owner；`duration-model/**` 只承接该 helper 的 bounded history、prediction、recording 与 storage mechanics。

helper 从 frozen public graph 的 `dependsOn` / `observes` 形成 critical-path score。history identity 由调用方的
canonical projection 与 model settings 组成；持久材料保留 digest、admitted-to-settled duration、settlement kind 与
observation sequence。missing、malformed、incompatible 或 read-failed history 形成 empty model；invalid identity、
setup、prediction 或 score construction failure 使用 static decision fallback。record/write failure 与并发 last-writer
只影响后续样本；observer failure 由 helper 包含。参数、安全与使用方法由[调度指南](../guides/learned-scheduling.md)拥有。

### Project Run child owners

`src/project-run/**` 的目录层级表达下列父子关系；表中职责不改变 Product public entry 或 RunResult owner。

| 路径                               | 下级 owner 的职责                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invocation/**`                    | 一次 invocation 的创建、路径、Scheduler handoff、execution candidate 与 progress counter。                                                            |
| `completion/**`                    | sealed Check facts 之后的 machine publication 与 terminal result。                                                                                    |
| `outputs/**`                       | Run output 的选择与 status。                                                                                                                          |
| `task-scheduler/admission-core/**` | immutable admission graph/state 的编译、查询、选择与 transition。                                                                                     |
| `task-scheduler/measurement/**`    | timing、summary 与 diagnostic measurement。                                                                                                           |
| `task-scheduler/**` 父层           | 实际 Scheduler lifecycle、graph validation 与两个子簇间的 integration。                                                                               |
| 其它直接子 owner                   | `check-execution/**`、`controls/**`、`diagnostic-logging/**`、`progress-rendering/**`与 `admission-strategy-provider/**` 继续各自拥有其既有领域职责。 |

### Function-metrics analyzer

`src/package-checks/function-metrics/analyzer/**` 只处理 supplied source 的 Lizard-domain analysis。Product admission、I/O、cancellation 与 metric mapping 留在目录外；唯一外部生产 façade、Worker/adapter 责任、source-alignment 和 provenance 验证见[Scanner dependencies](scanner-dependencies.md#owner-local-adapters)。

## Definition boundary

`defineConfig` 返回普通 Definition value；递归 Check tree 的 executable 与 container 经 validation/normalization 形成 canonical catalog。容器只提供 scheduling inheritance，不产生独立 facts/output entity；Product 不识别随包 Check ID 或 options domain shape。

[Project Definition](project-definition.md)完整维护 closed grammar、canonical options、scheduling/flags 和 declarative fingerprint。validation 必须在 execution、scanner、cache、progress 或 output work 前闭合；trusted preflight/execution/parseData 函数只保留 identity，不执行，也不进入声明性或机器投影。公开参数与组合规则见[API 机制](../api-mechanics.md)。

## Execution boundary

Invocation 冻结 root/output/artifact paths、验证完整 graph，并在 cancellation precedence 之后完成一次 flag-control barrier；Scheduler 再对 admitted Task 运行 task-local preflight 和 execution。独立 ready preflight 可并行，不能形成全局 barrier。路径/callback capability 见 [Project Run](project-run.md)，preflight snapshot 与 flag selection 见 [Project Definition](project-definition.md)。

Scheduler 是 Run-private child，使用共同 immutable admission reducer 维护 graph、relations、mutex、root/scoped/named capacity、cancellation 与 settlement；real shell 独占真实 Task/Promise 和 effects。policy 只交回决定，不获得执行权限。reducer、simulation、hard guards、measurement 与 terminal handoff 由[Scheduler 实现](scheduler.md)完整拥有。

### Public prepared admission-strategy lifecycle

Invocation 拥有 prepare/complete，Scheduler 只接收同步 policy，并在 drain 后 seal measurement、交付 generic Hooks；返回 sealed context 后 Invocation 才 complete。[完整生命周期与 failure containment](scheduler.md#public-prepared-admission-strategy-lifecycle)说明两层的交接，公开使用见[调度指南](../guides/scheduling.md)。

### Check execution 与 settlement handoff

每个 admitted callback 只接收 [Project Run](project-run.md#invocation-and-results)投影的 Check-local capability。execution owner 验证 terminal result 和 messages attachment，将 stripped four-state result 交给 settlement；只有 settlement 接受后，accepted Records 与 detached author messages 才进入 private lifecycle feedback，messages 另进入 RunResult readback。非法 attachment 不接受 partial author messages。

async console capture 独立于 author attachment：throw 或 malformed result 不丢弃已经捕获的文本。console router 的安装/恢复、分阶段 message 顺序和唯一 progress preview owner 见[人读输出](human-output.md#check-console-capture-maintenance)。renderer 只能消费反馈，不能回写 accepted facts、RunResult 或 machine publication。

execution owner 在 author execution 前开始 monotonic per-Check timing，在 result/Record validation 与 settlement 后结束；同一 `{ checkId, durationMs | null }` 事实供 lifecycle feedback 和 `RunResult.checkDurations` 使用。flag-control、preflight-blocked 与 prerequisite-blocked 没有 started fact，duration 为 null；timing/messages 都不进入 CheckOutcome、Record 或 machine model。

ordinary throw、malformed result、Record misuse 和 cancellation 在 owning execution boundary 结算 unavailable。Scheduler 对 non-passed prerequisites 阻止 author work，对 observes 只等待 terminal；cancellation 停止新 admission 并向 started callbacks 传同一 signal，drain 后保留已 settled facts、安全关闭剩余 Check。host runtime 不能强停 non-cooperative callback。

## Check facts

`check-settlement/**` 为每个 canonical executable Check 恰好 register 一次，接受 terminal result 和 Check-owned supplemental Records，最后只冻结 `{ checks, records }`。canonical validation、Record identity、accepted-record retention 与 terminal closure 由 [Check 结果](check-results.md#check-and-record-facts)拥有；Task identity、callback、scheduler bookkeeping 和 scanner-private payload 不是 Check facts。

callback-local dependency view 仅授权 normalized direct `dependsOn ∪ observes`。它从 package-private settled Check seam 取得原有 canonical final-data 引用，不调用 provider parser、不读取 supplemental Records，也不建立第二套 facts store；公开 get/list 类型与失败边界由[依赖数据指南](../guides/check-dependencies.md)定义。

Run 只在 explicit aggregation 配置下读取选定 settled statuses；effective aggregation 与 flag control 使用同一 private selection，不发布 activation metadata。aggregate 不隐藏或改写 raw facts，接线与 Gate mapping 见[Check 结果](check-results.md#explicit-aggregation-and-repository-gate-mapping)。

## Caller-keyed cache boundary

`src/cache/**` 是独立 package-root helper：它只拥有 caller-keyed canonical JSON object 的本地存储 mechanics，不拥有 caller key correctness、payload meaning 或缓存 observation 如何影响 Check/项目行为的 policy。它既不发现项目输入，也不获得 project root、scanner、Check facts、diagnostic logger、output 或 Run lifecycle capability；cache hit 也不跳过 execution 或重放 Check settlement。完整 public contract 由[缓存计算结果](../guides/cache-results.md)拥有。

cache directory 是 caller-trusted disposable local state。atomic temporary publication 只保护完整 target，不引入 lock、single-flight、cleanup、remote sharing、tamper resistance 或 secret protection。duplicate detection 的 Check-local raw fragment cache 继续由该 Check 的 scanner/availability owner 解释，不因 standalone helper 而迁移或改变 unavailable mapping。

## Package-provided Checks and exact inputs

随包 constructors 返回 ordinary Check，没有 Definition/settlement 特权。每个 Check 拥有 options validation、preflight、领域 measurement/Finding、Record 和 unavailable vocabulary；三个 area-based quality Checks 仅共享真正共同的 policy、area overlap 和 Finding counting，Core 不解释这些领域模型。

file collection/exact membership 由 [Project files](project-files.md)提供，选择和 code-area policy 留在 owning options。jscpd、SCC 与内置 function analyzer 各由唯一 producing Check 拥有；adapter 只收 accepted exact input，任何 out-of-set batch 在 conversion 前拒绝。raw scanner payload 不进入 facts/publication；tool/provenance 边界见 [Scanner dependencies](scanner-dependencies.md)，公开契约从[Check 指南](../navigation.md#随包-check-指南)进入。

## Output and downstream boundary

completion 从 sealed Check facts 创建一个 validated machine v4 model，再投影 two-file candidate；它不解释 Check-local data、不重算 status/aggregation。candidate validation 与 publication cleanup 见[机器输出维护](output-maintenance.md)，完整机器契约见 [Output](../output.md)。

console capture、progress renderer 和 core/scheduler diagnostic channels 由[人读输出实现](human-output.md)分别拥有。diagnostics 在 Product 已知事实形成时追加，不从终态 snapshot 或 process transcript 重建过程；Scheduler graph 只记录一次，后续 decision 引用 fingerprint。summary 是 human-only observation，不成为 machine/result/progress 字段或自动调参输入。

RunResult owner 组合 warnings、branch-specific diagnostic、可用的 final snapshot、durations/messages、aggregate 和 output statuses。public inventory 只导出 authoring/run values 与 types，不暴露 settlement capability、scanner adapter、task engine 或 renderer/stream/clock handoff；公开结果分支见[API 机制](../api-mechanics.md#runresult-分支)。

## Runtime boundary

项目 callback 在调用方的 Node runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source 不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository Gate 单向地从 exact installed public entry 导入 run，拥有 candidate preparation 与项目 evidence root；通过同一次 Controls 分配 Product outputs 和 Check artifact namespaces，不解析它们重建结果。完整接线由[Project Gate](../tooling/project-gate.md)维护。Workspace tooling 不获得 Product settlement capability；测试只使用并清理自己的 fixture directory。
