# 比较假设调度分支

用 `createAdmissionGraph(...)` 分析独立静态图，不必定义或执行真实 Check。真实 Run 的并发约束和准入 policy 见[调度 Check](scheduling.md)。

## 模拟 AdmissionGraph

`createAdmissionGraph({ graph, maxParallel })` 接收已规范化的 `SchedulerGraphSnapshot`，不是 Definition 的 scheduler 配置；`maxParallel` 必须是正 safe integer。构图时验证完整字段和引用，无效输入抛错。

```ts
import { createAdmissionGraph } from "@zxyycom/vibe-check";

const graph = createAdmissionGraph({
  graph: {
    resourceCapacities: [{ resourceId: "browser", units: 1 }],
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        resourceClaims: [{ resourceId: "browser", units: 1 }],
        scopeId: null,
        taskId: "compile"
      },
      {
        admissionPriority: 0,
        dependsOn: ["compile"],
        mutex: [],
        observes: [],
        resourceClaims: [],
        scopeId: null,
        taskId: "publish"
      }
    ]
  },
  maxParallel: 1
});

const initial = graph.initialState();
const compile = initial.select("compile");
if (!compile.accepted) throw new Error(`Cannot select compile: ${compile.reason.kind}`);

// Retaining `initial` and the successor forms two independent hypothetical branches.
const completed = compile.state.settle("compile", "satisfied");
if (!completed.accepted || !completed.state.catalog.selectableTaskIds.includes("publish")) {
  throw new Error("Expected publish to become selectable after hypothetical completion");
}
```

`select` / `settle` 成功时返回新的 immutable `state`，保留原 state 即可分支；拒绝时返回 `{ accepted: false, reason }`，没有 successor。模拟不启动真实 Check、不预留真实资源，也不写回 Run。

只有 running Task 可 `settle`：`satisfied` 满足其 `dependsOn` 下游的这项前置；`unsatisfied` 使未满足前置的下游被阻止并结算，不能再选择。`observes` 只等待终态，不要求 satisfied。例如，从同一 `compile.state` 改用 `settle("compile", "unsatisfied")`，`publish` 就不会变为可选。

输入 graph 的 named resource capacities/claims 使用 canonical `{ resourceId, units }[]`；successor inspection 投影当前 `{ capacity, inUse, available }`，不提供 reservation 或真实资源 handle。
