# Design

本设计以“无状态 policy 提议、Scheduler 只守硬条件”为唯一分界：先移除现有 reservation Core state，再把同一 select/wait contract 安全公开给调用方。

## Context

当前源码事实是 private admission path 仍含 `reservationTaskId`、`ReservationUpdate`、reservation-aware static selection、Scheduler decision field 和 diagnostic trace。它来自上游 archived Change 的形成时实现；稳定文档不应提前被改写成该机制已经删除。

已确认的长期方向由以下 active Decisions 拥有：

1. [`use-stateless-admission-policies-with-hard-scheduler-guards`](../../docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md)：完整 immutable graph、candidate/capacity/runtime snapshot 与 `select | wait` 形成每轮纯决策；Core 只守 hard legality 和有限进展。
2. [`keep-gate-run-evidence-complete-with-stateless-scheduler-context`](../../docs/decisions/keep-gate-run-evidence-complete-with-stateless-scheduler-context.md)：Gate evidence 从 selected/wait 与 hard-guard facts 解释本轮，不能保存已退休的 reservation/sticky/await-reason state。
3. [`expose-stateless-custom-admission-policy-to-callers`](../../docs/decisions/expose-stateless-custom-admission-policy-to-callers.md)：确定 closed public union、callback 命名、frozen projection、fingerprint、fatal fault、diagnostic 与 overlapping-Run boundary。

有限静态 graph 给无状态 policy 足够的进展保证：合法 `select` 使 pending 集合缩小；合法 `wait` 必有 running work settlement 产生下一 snapshot；running 为空时不能 wait。full graph 让 static/custom/learned 算法利用后继、关键路径和全貌，而不是只有局部 ready list；它不授权算法直接启动或结算 Task。

## Goals / Non-Goals

**Goals**

- 删除 reservation 作为 Core protocol，保留 static tightening 的效果但以每轮重算表达。
- 以最小 typed public contract 暴露 custom policy，而不泄漏 private engine objects或再造状态机。
- 把 callback failure 作为明确 execution fault 收束，使 running trusted work 仍留在同一 Run 生命周期内。
- 使 Definition、runtime、package consumer、stable docs、Decisions 和 Test Evidence 能分别验证自己的边界。

**Non-Goals**

- 不提供 reservation、sticky target、fairness/aging/starvation memory、policy-owned state protocol、priority queue 或 graph 外 priority 输入。
- 不提供 async/thenable callback、registry、brand、`policyId`、`policyVersion`、plugin discovery、composition、hook、全局 callback lock、dynamic Task API 或 imperative command。
- 不向 callback 公开 Check options/functions、data、Records、messages、logger、clock、signal、private type、`Set`/`Map`、execution state 或 console capture。
- 不把 policy diagnostic、console、timing、telemetry、event parser/schema 或 check-message ownership 作为首版能力。

## Decisions

### Intended Change

#### 1. 先收敛 private contract，不保留 reservation compatibility layer

删除 Scheduler state 和所有 private policy/decision/diagnostic surface 中的 `reservationTaskId`、`ReservationUpdate`、`keep`、`set`、`clear`、sticky trace 以及把 policy preference 写为 Core reason 的字段。private policy input 仍是同一 frozen normalized graph、relation/mutex candidates、per-candidate capacity 和 immutable runtime inspection；private policy result 精确为：

```ts
type AdmissionProposal =
  | { readonly kind: "select"; readonly taskId: string }
  | { readonly kind: "wait" };
```

static tightening 不缓存“下次必须选谁”：每轮重算 tightening/constrained/priority/canonical preference，在 capacity 暂不可 admit 时返回 `wait`，然后在 settlement 后由新 snapshot 再算。hard scheduler facts 与 diagnostic evidence 可描述 candidate、capacity、blocker、selected Task 或 wait，但不保存策略理由、reservation 或公平状态。

#### 2. public authoring 是 closed static/custom，helper 不创建第二种语义

`ProjectDefinition.scheduler.admissionPolicy` 接受省略、显式 static 或 custom：

```ts
scheduler: {
  admissionPolicy: {
    kind: "custom",
    proposeAdmission(context) {
      return { kind: "select", taskId: context.candidates[0].taskId };
    }
  }
}
```

`defineAdmissionPolicy(...)` 只保存 TypeScript inference；inline 同形 object 与 helper result 完全等价。normalization 将省略和 explicit static 收敛为同一 canonical static form。definition fingerprint 仅投影 `{ kind: "static" }` 或 `{ kind: "custom" }`：callback identity/source/closure 不可序列化且不进入 fingerprint，也不会添加无消费者的 identity/version/registry fields。

`proposeAdmission` 是 trusted synchronous pure callback。Product 保留调用方函数以供 invocation 调用，但不 sandbox、timeout、isolate 或 lock 它；同一 Definition 的 overlapping Runs 共享 closure，因此 reentrancy 是 caller responsibility。thenable 不是同步 proposal。

#### 3. context 是 detached frozen public DTO，而不是 private inspection 的别名

adapter 在 normalized graph 和 prepared collection 已闭合后构建独立、ordinary、deep-frozen projection。它以 canonical arrays 完整交接 graph tasks、scopes 和 relations；每个 public Task 中的 metadata 是 priority/topology 的唯一事实来源。动态部分仅含：

- relation/mutex candidate arrays：`taskId` 与 `canAdmit`；
- running IDs、settled IDs、active scope IDs；
- root/effective capacity 与解释 candidate 的最小 immutable runtime facts。

projection 不返回 `PlannedTaskGraph`、planned Task、`SchedulerDecision`、`SchedulerInspection`、`Set`、`Map`、Definition/Check options、functions、final data、Records、messages、logger、clock、signal、mutable scheduler state 或任何 Task command。每次 callback 收到的只是可读 data snapshot；冻结 input 不使 caller code 被 sandbox。

#### 4. adapter 提议，Scheduler 决定是否能执行

adapter 严格验证 ordinary closed result shape、同步性和 selected ID。Scheduler 仍以当轮真实 state 只验证下一运行选项：select 的 Task 必须 pending、是 relation/mutex candidate、当前 capacity 可 admit，且未穿过 cancellation/lifecycle cutoff；wait 必须有 running work 能进入 settlement。它独占 readiness、mutex、capacity、cutoff、blocked settlement、state transition、Task start、await、settlement 和 terminal aggregation。

Scheduler 不检查 policy 是否公平、是否饥饿、priority 是否合理、是否应选择其它 candidate 或 wait 的“理由”。candidate 在 callback 到 guard 之间失效时，guard 以 fatal fault 处理，不从 caller proposal 推断替代选择。

#### 5. fault 是 Run-scoped execution failure，不是 fallback

以下都归为 bounded admission-policy fault category：callback throw、thenable、malformed result、non-candidate select、capacity-invalid select、lifecycle-invalid select 与 undrainable wait。fault 后：

1. 禁止新的 admission；
2. 将尚 pending Tasks 以现有受控 pending-cancellation path 结算；
3. await/drain 已开始 Task；
4. 在同一 Run 生命周期内返回专用 `admission-policy-failed` execution result。

不 fallback 到 static policy、不暴露 raw thrown value/result/stack/caller data、不把 fault 伪装成 Check terminal status。diagnostic 只写有限 category。custom callback 不取得 Check console attribution、`checkMessages` 或 timing telemetry；不新增 public event grammar/parser/schema。

#### 6. public contract 必须由相邻 owners 一起落地

实现完成时，同步更新 Configuration、Architecture、API mechanics、testing、package inventory、declarations、example 与 installed consumer。stable docs 只在 source 和 tests 已实现后改为 current fact；三个 Decisions 只在实施、stable owner 和验证闭合后再按其 own workflow 对齐。后续 performance diagnostics 观察无状态 facts；learned history 在 Scheduler 外形成 immutable prediction snapshot，不会借 custom callback 在 Core 保存策略 state。

### Resulting Impacts

- reservation removal 跨 execution state、inspection、decision model、static policy、adapter、Scheduler shell、diagnostic renderer 与 existing tests；不得留下兼容 alias、空字段或只为 trace 保留的 Core state。
- public DTO 需要独立 schema/type/projection tests，验证 frozen/detached、canonical graph、最小 dynamic facts 与 forbidden-value absence；private policy tests 不能代替 public contract evidence。
- Definition grammar、validation、normalization、freeze、fingerprint、declaration build、root export、package inventory 和 installed consumer 都需要证明 helper/inline/static compatibility 与 runtime preservation。
- fault path 改变 invocation/scheduler boundary与 execution-result owner；tests 要分别证明 cancellation of pending、drain of running、result kind、diagnostic redaction和无 fallback。
- Test Evidence baseline 只证明现有 Case mapping；它不证明尚未实现的 public capability。新增/变更 Case 由实际 test owner 决定并在 Implementation 后闭合。

## Risks / Trade-offs

- trusted callback 可以阻塞或修改 caller runtime；deep-freeze 和 hard guard 保护 Product data/state，但不提供 host-code sandbox。
- full graph projection 固定首版可见面。新增 projection field 必须有真实 consumer，不能为了镜像 private state 预置。
- fatal fault 比 static fallback 更容易暴露 caller bug，但保留了显式作者调度语义；drain 使已启动 trusted work 不会脱离 Run 生命周期。
- 无状态模型不支持 retry/aging/循环队列等未来需求；只有真实需求超出有限静态 graph 模型时，才另立 Change 设计 opaque policy-owned state，Core 仍不理解算法字段。

## Open Questions

无。public callback、无状态 private boundary、hard guard、fault收束、diagnostic边界与实施顺序均由当前 Plan 和三条 active Decisions 固定；实施中发现会改变这些边界的需求必须建立后续 Decision/Change，不能以局部兼容字段加入。
