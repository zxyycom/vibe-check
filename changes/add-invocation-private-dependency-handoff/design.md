# Design

本设计用 package-authentic 泛型 marker 连接 provider authoring、accepted result 与 direct dependency read，并以独立 invocation store 隔离 canonical facts 和 identity-preserving references。

## Context

长期方向由 [`provide-invocation-private-dependency-handoff.md`](../../docs/decisions/provide-invocation-private-dependency-handoff.md) 承接。当前 [`check-dependencies.md`](../../docs/guides/check-dependencies.md) 定义 string `dependencies.get(checkId)` 从 settled Core facts 读取 canonical data，`parseData` 只负责从 detached/cross-version facts 恢复 provider 业务类型。

现有实现由 terminal adapter 按 exact keys 从 author result 提取 four-state result，再交给 Core 独占 canonical settlement；callback-local dependency view 则接收 normalized `dependsOn ∪ observes`。Handoff 必须在 Definition check-tree、`terminal-result.ts`、`execution-settlement.ts`、`ready-check-execution.ts`、`resolved-checks.ts` 与 `dependencies.ts` 的既有责任链内连接这两个 seam，不修改 Core 或 Scheduler 的事实模型。

| Contract | Canonical `data` | Private `handoff` |
| --- | --- | --- |
| Value semantics | canonicalize、detach、deep-freeze | 保留 producer 返回的 reference identity |
| Consumers | Core、RunResult、machine 与现有 dependency readers | 同一 execution graph 的 direct `dependsOn` consumer |
| Type recovery | provider `parseData` | `CheckHandoff<T>` marker 泛型；无序列化往返或 parser |
| Product validation | canonical object grammar | marker authenticity、result branch、non-null reference、settlement 与 relation authorization |
| Domain ownership | provider parser/owner | producer/caller 的 assertion、mutation discipline 与资源 cleanup |

## Goals / Non-Goals

### Goals

- 用一个 marker 同时约束 provider result 和 provider-object read 的精确类型，不要求 consumer 手写 generic。
- 让 canonical fact 与 private reference 在一次 read 中并列返回，但在 storage、publication 与生命周期上保持分离。
- 对 fan-out 保留严格 identity，对每次 Run 隔离，并让所有退出路径释放 Product 持有的引用。

### Boundaries

- Handoff 不进入 Core、CheckOutcome、RunResult、machine、progress、diagnostics、fingerprint、cache、history 或 aggregation。
- Handoff 没有 Product parser、schema、clone、freeze、serialization、replay 或 disposer；store `clear()` 只释放 Product reference。
- Provider-object read 不扩大 `observes` 或 string read 的授权；类型信息不构成 runtime authorization。
- 本 Change 不为具体 release workflow 接线，也不把 callable/handle 的业务安全性变成 Product 承诺。

## Decisions

### Intended Change

1. **Marker and authoring field.** 公开 `defineCheckHandoff<T extends object>(): CheckHandoff<T>`，并把返回 token 放在 executable Check 的 `handoff` 字段。Token 是冻结、无配置、由 package-private registry 识别的 opaque identity；自有 `handoff: undefined`、伪造 object 与 container marker 均由 Definition closed validation 拒绝。Marker 的真实性是当前 package runtime 实例内的能力，不声称跨重复安装实例互认。
2. **Result type matrix.** `CheckResult<FinalData, Handoff = never>` 保持现有单泛型调用兼容。`Handoff = never` 时所有 branch 都不含 `handoff`；声明 marker 后，只有 `passed` branch 必须含 `handoff: Handoff`，`failed` / `not-applicable` / `unavailable` 仍禁止该字段。`defineCheck` 的 options、prepared-options、parser/no-parser 组合共享这一约束，不另建执行模型。
3. **Reference grammar.** Runtime 接受与 TypeScript `object` 约束一致的非 null reference，即 `typeof value === "object" || typeof value === "function"`；它不要求 own keys，也不访问 getter、Proxy member、iterator 或 serialization hook。Callable 只是可交接 reference，不因此获得 Product 执行权限。
4. **Definition boundary.** Shallow closed authoring snapshot 保留 marker identity；validation 仅在 executable provider 接受 genuine token，并让 validation materialization 与 normalized Check 保留该 token。Declarative snapshot 在形成 fingerprint 前显式剥离 marker，方式与 execution/preflight/parseData callback identity 相同。
5. **Settlement-gated commit.** Terminal adapter 根据 normalized provider marker 校验 exact result keys，并把 stripped four-state result 与候选 reference 分开。Core 先独占 canonical settlement；只有 author source、`passed`、terminal grammar 合法且 `authorResultAccepted` 时，execution owner 才将 `{ checkId, marker, value }` 提交到 private store。取消、throw、malformed branch、Record misuse、invalid canonical data 和 Product-created outcome 都不提交。
6. **Invocation store lifecycle.** Store 属于 `CheckExecutionState`/execution owner，以 Check ID 唯一发布 marker/value；重复发布是 invariant failure。`executePreparedResolvedChecks` 用 `try/finally` 包住 flag settlements、scheduled graph 和 finalization，在返回 resolved execution 或抛出前 `clear()`，因此 completed、cancelled、admission-policy failure 与 invariant failure 都不把 reference 带出 execution graph。
7. **Provider-aware read contract.** `dependencies.get(provider)` 从 provider literal ID 与 `CheckHandoff<T>` 推断 `DependencyHandoffReadResult<Id, T>`。成功分支固定为 `{ ok: true, checkId: Id, status: "passed", data: CanonicalJsonObject, handoff: T }`。失败分支只包含：`dependency-not-declared`（输入不是 genuine provider 或 ID 不在 effective direct `dependsOn`）与 `upstream-handoff-unavailable`（ID 已授权，但 store 没有同一 marker 的 accepted value）。失败不返回 upstream data/handoff；`observes` 对此 overload 按未声明 handoff capability fail closed。
8. **Compatibility and telemetry.** `dependencies.get(string): DependencyReadResult` 与 `list()` 的实现、返回 shape、direct-union authorization 和 error codes 保持不变；provider-object success 中的 `data` 仍是 Core-owned canonical object，Product 不调用 `parseData`。Dependency diagnostic 只复用现有 producer/status/data-presence metadata，不记录 marker、handoff、summary 或 handoff-presence bit。
9. **Cleanup ownership.** Product 只丢弃 store reference，不调用 handoff 上的 `close` / `dispose` / symbol hook。Producer/caller 必须保证 fan-out 的 immutable observation；真实资源若需在 consumers 后关闭，应通过显式 graph ordering、consumer-owned `try/finally` 或 Run 外层 lifecycle 表达，不能依赖 GC 或 Product store clearing。
10. **Evidence allocation.** 新增有直接 observable 目的的 `WB-RUNTIME-DEPENDENCY-HANDOFF-001` Case，覆盖 accepted identity、fan-out、authorization、isolation 与 cleanup；Definition marker/fingerprint、terminal rejection、unchanged string observation、machine/diagnostic absence及 installed public usage分别扩展现有 `WB-PROJECT-DEFINITION-001`、`WB-RUNTIME-CHECK-FAILURE-001`、`WB-RUNTIME-DEPENDENCY-OBSERVATION-001`、`WB-OUTPUT-MACHINE-V4-CONTRACT-001`、`WB-DIAGNOSTIC-LOGGING-OUTPUT-001` 和 `AUX-PUBLIC-AUTHORING-TYPES-001`。只在对应测试实体存在后维护 Case，不创建空证据。

### Resulting Impacts

- `src/check/check.ts` 需要 marker owner、conditional result types、provider type extraction 与 get overload；`src/index.ts` 和 public inventory 需要导出/审计新增 helper 与必要类型。
- `src/project-definition/check-tree/**` 与 `project-definition.ts` 需要保留 runtime marker、拒绝 container/伪造值并从 declarative identity 中剥离；existing parser and prepared-options inference 必须保持。
- `terminal-result.ts`、`execution-settlement.ts`、`ready-check-execution.ts`、`resolved-checks.ts` 与 `dependencies.ts` 需要形成“validate → Core settle → private commit → direct read → finally clear”的连续责任边界；Core session、Scheduler Task value 和 resolved execution DTO 不变。
- Publication absence 主要由 marker/store 不进入上述 DTO 证明，并在 machine v4 与 diagnostic 代表入口补回归；cache、aggregation 与 progress 没有接收新字段，不新增重复 handoff-aware adapter。
- Public guide 用一份完整 provider/consumer 示例同时展示 marker、`passed` handoff、provider-aware read、canonical parser 与 cleanup responsibility；installed type/runtime fixture 证明发布声明与真实 identity。

## Risks / Trade-offs

- Identity preservation 与任意 reference 的 runtime deep immutability 不可同时保证；错误 mutation 会影响同 Run fan-out，必须由可信 producer contract 与 graph ordering控制。
- package-instance-local marker 会拒绝来自另一物理 package copy 的 token；这是 genuine marker validation 的代价，应在报错/文档中定位为 Definition mismatch，而不是静默降级为 canonical-only provider。
- Provider-aware read 增加 overload matrix；若用宽泛 conditional type 合并所有 authoring 组合，可能损害现有 parser/options inference。实现应优先保留可读的 closed fields 与 compile-time negative corpus，而不是追求最少 overload 数。
- 显式 `clear()` 可证明 Product 不持有引用，但不能证明 JavaScript GC 或外部 resource 已释放；验收不得把两者混为一谈。

## Open Questions

无。Public field 名称、result branch、reference grammar、read success/error union、authorization、store cleanup 与 evidence owner 已在本 Plan 固定；实施中若需改变这些 contract，应先更新 proposal/design/tasks 并重新审阅是否需要演进长期 Decision。

## Implementation Handoff

- **权威来源：** `proposal.md` 固定目标、范围与成功标准；本文件固定 contract、责任 seam、边界与重新规划条件；`tasks.md` 是执行顺序和进度的唯一 owner。稳定产品文档与源码仍是现状事实 owner，若它们与本 Plan 的假设不一致，按下述条件停止而不是自行改写目标。
- **起点与顺序：** 从任务 1.1 开始；按 1.1 → 1.2 → 1.3/1.4（作为 settlement/store 的同一 integration slice）→ 1.5 → 1.6–1.9 → 2.1–2.3 推进。每一步先运行该任务要求的最窄证据，再扩大到最终 candidate gate。
- **直接实施边界：** 实现可在既定 owner 内调整局部类型、helper 与测试布局，但不得把 handoff 写入 Core/Scheduler/publication DTO，不得扩大到 `observes` 或 transitive authorization，也不得引入 parser、clone、freeze、serialization 或 disposer 语义。
- **停止并重新规划：** 只有在 genuine marker 必须跨物理 package instance 互认、能力必须改变 Core/Scheduler contract，或需要改变已固定的 public field、result branch、reference grammar、success/error union、authorization 或 lifecycle 时停止实施，先同步 proposal/design/tasks，并复核长期 Decision。普通实现细节和测试落点不构成阻塞。
- **完成判据：** 只有 1.9 的事实对齐审查和 2.1–2.3 的全部验证都完成，才能把本 Change 视为已实施；未完成项保持 unchecked，不用局部测试通过替代整体验收。
