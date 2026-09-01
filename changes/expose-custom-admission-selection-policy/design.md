# Design

本设计只把候选选择偏好开放为一个同步trusted hook；Scheduler继续形成候选、保护reservation、验证返回值并独占所有imperative动作。

## Context

Project Definition的`preflight`、`execution`与`parseData`已经是caller-runtime trusted functions。Definition保留function identity供同次Run调用，但declarative snapshot和fingerprint不序列化functions。现有Decision也明确trusted function可能infinite loop、`process.exit`、修改global或不协作取消，Product不提供worker sandbox。

`extract-scheduler-admission-selection-policy`计划把每次准入收敛为private select/waitresult，并在形成`SchedulerDecision`前校验candidate、capacity和reservation。公共扩展必须适配到这个guarded边界，而不能让author callback直接返回`SchedulerDecision`或调用imperativeshell。

本Change中的“custom policy”准确表示：

> 在Product已经确定的同层合法候选中，选择下一项Task ID；不改变什么Task合法，也不控制何时settle。

## Goals / Non-Goals

**Goals**

- 让项目拥有Product无法统一解释的候选排序依据，而不伪造dependency或修改Definition顺序。
- 用一个同步hook和static fallback保持API最小、可测试且有确定故障出口。
- 让publicview足以实现长任务优先、项目自有score或预先加载的模型，同时不暴露mutableScheduler internals。
- 让hook identity、调用时机、console、fault和caller-runtime风险可从文档直接恢复。

**Non-Goals**

- 不开放依赖合法性、outcome predicate、mutex、capacity、reservation、fail-fast、cancellation或settlement hook。
- 不允许async/thenable selector、deliberate idle、preemption、dynamic Task、Task retry或priority inheritance。
- 不提供prepare/finalize/onSettlement lifecycle、policy registry、plugin discovery或多个policy的composition DSL。
- 不让custom policy读取Check final data、Records、messages、options、functions、project filesystem capability或diagnostic logger。
- 不承诺trusted function isolation、timeout、determinism或side-effect rollback。

## Decisions

### Intended Change

#### 1. Public authoring是普通trusted Definition value

authoring形状以实现时公共命名为准，目标contract如下：

```ts
const policy = defineAdmissionPolicy({
  kind: "custom",
  policyId: "project-long-tail",
  policyVersion: "1",
  selectNext({ candidates }) {
    return candidates[0]?.taskId;
  }
});

defineConfig({
  checks,
  scheduler: { maxParallel: 4, admissionPolicy: policy }
});
```

`defineAdmissionPolicy`只改善literal inference并返回同shape ordinary value。inline object具有相同runtime语义；Product不按module path发现或重新加载policy，也不注册global strategy。

`policyId`与`policyVersion`都是non-empty string，沿用Check ID的author-text语义：不trim、不做Unicode normalization，并以原值进入declarative snapshot/fingerprint。diagnostic renderer负责安全转义，而不是修改identity。`selectNext`必须是function但不进入snapshot。author改变function行为时负责更新version；Product无法hash closure、源码、依赖或外部state，也不把id/version宣称为代码真实性证明。同一Definition value重复或重叠执行时复用同一function与closure identity，Product不会clone、reset或序列化closure。

#### 2. Hook只接收stable read-only view

hook context是deep-frozen ordinary object：

```ts
interface AdmissionSelectionContext {
  readonly layer: "tightening-scope" | "constrained-continuation" | "ordinary-ready";
  readonly candidates: readonly AdmissionCandidateView[];
  readonly graph: AdmissionGraphView;
  readonly runningTaskIds: readonly string[];
  readonly settledTaskIds: readonly string[];
  readonly capacity: Readonly<{
    rootMaxParallel: number;
    effectiveMaxParallel: number;
    running: number;
  }>;
}
```

每个candidate至少包含Task ID、normalized `admissionPriority`、effective `maxParallel`和canonical order index；candidate数组按当前layer在调用custom hook前原本使用的stable tie-break顺序排列。graph view按最终dependency/observation Change提供closed directed readiness edges与同一组静态Task IDs，并按canonical graph order排列。running/settled Task IDs也按canonical graph order投影，不把Map iteration或settlement chronology意外发布为契约。是否公开mutex名称或未来resource claims只在相应稳定contract已实施且custom selector有真实consumer时增加，不预先镜像全部internal graph。

running/settled只表示Task lifecycle，不承诺ordinaryCheck terminal status；custom policy不能从这里读取`passed`、`failed`、`not-applicable`或`unavailable`。需要基于outcome执行另一Check时使用正式observation graph，而不是调度hook。

#### 3. Product先固定layer与progress guarantee

Scheduler先处理cancellation、blocked settlement、completion和sticky reservation。有效reservation存在时不调用custom hook。没有reservation时，Product按当前规则确定本轮selection layer，并在tightening/constrained层先应用维护scope合法进展所需的hard cap过滤；hook只看到此后仍可相互替换的同层candidates。

这使custom policy可以任意选择候选，却不能让ordinary Task越过tightening progress、让高score Task偷走reservation或绕过`canAdmit`。named resource若以后增加新的progress guarantee，也必须先由Product形成候选层，再调用同一hook。

#### 4. 一个同步返回值足以表达选择偏好

`selectNext(context)`的合法返回只有：

- 一个`context.candidates`中存在的Task ID：请求选择该Task；
- `undefined`：本轮委托static-priority comparator。

hook不能返回wait、scoremap、reservation update、Task object或command。需要复杂算法时，author可以在同步function内计算并返回一个ID；需要I/O准备时，project-owned wrapper应在构造Definition前完成，并通过closure提供immutable model。Product不为此增加async prepare/finalize lifecycle。

#### 5. Fault后整轮禁用custom hook

以下任一情况构成policy fault：throw、返回Promise/thenable、返回非string且非undefined、空string或不属于candidate的ID。Product不把fault映射为configuration、planning、execution或Check failure；它拒绝该返回值，对本轮使用static fallback，并在同一invocation余下cycles不再调用hook。

disable-on-first-fault避免反复执行有副作用的错误代码、日志洪泛和不稳定的“有时custom有时fallback”。禁用状态属于单次invocation；一个重叠Run中的fault不能禁用另一个Run。diagnostic启用时恰好记录一个fault event，包含policy identity、fault code与selection layer，不序列化thrown value或closure state。

#### 6. Console有独立policy归属

resolved Check console router已经在preflight前安装并贯穿Scheduler。custom hook调用时建立policy-local capture context：常用`console.*`被格式化为有界diagnostic observation，不进入任一Check buffer、`RunResult.checkMessages`或managed progress stream。diagnostic disabled时capture被丢弃，避免恢复host console破坏TTY。

直接`process.stdout.write`/`stderr.write`、预先保存的console method、global console replacement与hook创建的floating work仍可能绕过归属；consumer文档要求selector保持短小、同步、无I/O，并把高容量调试写入项目自有transcript。

#### 7. Timing与diagnostic不改变选择

imperative adapter用invocation monotonic clock测量同步hook调用，clock anomaly只使duration unavailable。逐次`SchedulerDecision`继续记录最终selected Task和reason；custom event另记录policy identity、layer、candidate count、result=`selected | delegated | fault-disabled`及hook duration。

若`add-scheduler-performance-diagnostics`已实施，custom hook duration必须与pureProduct scheduler own time分列。diagnostic logger failure沿用现有output containment，不能触发policy fallback或改变selector input。

#### 8. Public contract不暴露private engine types

package root只导出authoring helper和闭合view/result supporting types。它不导出`SchedulerDecision`、`SchedulerInspection`、`PlannedTask`、reservation update、execution state、imperative callbacks或logger/clock handoff。public adapter显式从private snapshot投影并freeze view，防止internal字段自然泄漏成为兼容承诺。

### Resulting Impacts

- `ProjectDefinition.scheduler`从单一数据policy扩展为包含trusted function的ordinaryvalue；validation需要像Check trusted functions一样保留function，同时为fingerprint建立独立declarativeprojection。
- hook invocation发生在Check console router生命周期内，但不属于Check execution；console router需要支持policycontext而不改变Check message owner。
- pure built-inpolicy仍可直接测试；custom adapter包含trusted callback side effect，因此imperative boundary必须单独测试fault、timing和overlappingRun隔离。
- learned-critical-path仍是Product-ownedbuilt-in variant；custom author若自行学习，历史key、I/O和正确性完全由项目closure负责，Product不提供隐式state manager。

## Risks / Trade-offs

- customselector能在合法候选中制造很差的性能或非确定顺序；policyId/version、diagnostic和staticfallback提供可审计性，但Product不替author证明算法质量。
- sync trusted code可以阻塞整个caller runtime；禁止async避免stale Scheduler snapshot，却不能防止slow I/O或infinite loop。重复/重叠Run复用closure，因此有mutable state的selector还必须自行保证reentrancy。
- public graph view过宽会冻结internal模型，过窄会迫使author复制Definition；首版只提供实现候选排序所需的normalizedreadiness与capacity事实，新增字段要求真实consumer。
- fault回退隐藏了项目策略错误对质量结论的影响，但custompolicy只承接优化偏好；让fault直接失败Gate会把性能插件提升为质量owner。diagnostic是首版明确出口。
- console discard在diagnostic disabled时可能让错误debug困难；这是保护managedconsole的取舍，项目可启用diagnostic或使用自有transcript。

## Open Questions

无。首版采用一个同步`selectNext`、candidate-only返回、undefined staticfallback、first-fault整轮禁用、声明式id/version、policy-local console capture与internal-type projection；其它lifecycle hooks和composition明确后置。
