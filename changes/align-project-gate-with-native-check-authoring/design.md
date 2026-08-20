# Design

本 Design 将 Gate selection metadata 与普通 public `Check` execution 分层，使 process command 只是一个可选 Check implementation，而不是第二套 Gate authoring contract。

## Context

当前稳定事实与方向如下：

- [`docs/configuration.md`](../../docs/configuration.md#public-authoring-surface) 与 [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) 规定 Product 默认 Checks 和项目 Checks 使用同一种普通 `Check` value，并由 `defineCheck` 可选改善 inference。
- [`use-native-object-composition-for-check-customization`](../../docs/decisions/use-native-object-composition-for-check-customization.md) 与 [`expose-ordinary-check-values-with-define-check`](../../docs/decisions/expose-ordinary-check-values-with-define-check.md) 排除来源专属 object model、runtime brand 与第二 execution entry。
- [`docs/script-tooling.md`](../../docs/script-tooling.md#候选-project-gate) 记录当前候选 Gate 的 candidate-first identity guard、20-entry process catalog、profile/tag eligibility、per-Check transcript、fixed capacity、policy 与 `0/1/2` exit closure。
- 已归档的 [`build-candidate-backed-project-gate`](../archive/build-candidate-backed-project-gate/) 保存形成时 readiness evidence。[`replace-workspace-verifier-with-project-gate`](../replace-workspace-verifier-with-project-gate/) 先消费并重新验证该能力，完成正式 binding 与 legacy retirement。
- 本 Change 只在 cutover 完成后开始。它修改权威 Gate implementation，因此必须通过已经接线的正式 root entry 验收，但不重新执行 binding 迁移或恢复旧 verifier。

当前 `PROJECT_GATE_CATALOG` 的 entry 同时复制 Check identity/scheduling fields 和 process options。`createProjectGateDefinition()` 只能把所有 entries 映射到同一个 `createProcessCheck()`，policy 也假定每个 Check 只声明 `gate-command-failure` Record type。`defineProjectGateCatalog()` 还在 module load 时强制 total `20`、required `14`、full `19`。

## Goals / Non-Goals

### Goals

- 让 Gate canonical catalog 组合普通 public `Check` values，而不是 command-only descriptor values。
- 保留 profile/tag selection、expected eligibility 与 adapter final-result closure，且不要求每个 custom callback 重写 selection parser。
- 把 current process cancellation、transcript 与 safe failure Record semantics 保存在一个返回普通 `Check` 的 local helper 中。
- 删除 total/profile cardinality runtime locks 和重复数字测试，不为它们增加替代性数量测试。
- 让普通 process Check 的添加路径局限于一个 catalog entry；custom Check 使用同一个 public authoring surface。
- 更新稳定 owner、项目内简短添加说明、semantic Case evidence、candidate manifest，并以正式 root entry 形成无 disabled-tag required/full optimization handoff。

### Non-Goals

- 不重新设计 root package scripts、CI/workflow 或处理 legacy verifier；这些已由前置 cutover Change 完成。实现路径变化时只保持现有 bindings 到达同一个 Gate，不建立第二入口。
- 不公开 Gate catalog、process helper、profile/tag grammar 或 transcript API 到 npm package。
- 不改变现有 20 项命令的领域范围、当前 required/full eligibility、fixed capacity、log layout 或 `0/1/2` process exit meaning。
- 不在本 Change 增加 typed Record reporter inference或 Record result presentation；它们由独立的首次公开 package Changes 承接。
- 不为了复用建立 generic process Check package API；当前 helper 只属于 repository Gate consumer。

## Decisions

以下是 Draft 的目标结构；精确 wrapper signature 仍需在形成 Plan 前通过最小 TypeScript prototype 收敛。

### 1. Catalog entry 只增加 Gate selection metadata

Gate entry 的稳定公约数是一个普通 executable `Check`，以及仅由 Gate adapter 解释的 `profiles` / `tags`。entry 不再复制 `checkId`、`displayName`、`dependsOn`、`options`、`recordTypes` 或 `execution`：这些都从 `entry.check` 获得。

候选 shape 为：

```ts
interface ProjectGateEntry {
  readonly check: Check;
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}
```

这不是第二种 Check。selection metadata 只回答该项目 Gate 在一次 invocation 中是否进入当前 Check；Check value 继续独立拥有执行、Records、options 与 scheduling。

### 2. Eligibility wrapper 适配任意 executable Check

Project Definition projection 在调用原 Check execution 前统一解析 Gate flags并应用 profile/tag eligibility。excluded entry 返回现有 `profile-excluded` 或 `tag-disabled` N/A；eligible entry 将同一个 normalized context 交给原 execution。wrapper 必须保留 Check identity、options、record types、children/scheduling declaration和 callback result，不按 Check 来源分支。

Gate adapter 的 final closure继续从同一 entry selection metadata 计算 expected eligible/N/A outcomes；它不从 outcome 反推 selection，也不维护另一个 ID catalog。

### 3. `processCheck()` 是一个普通 Check factory

现有 process execution 代码保留为项目 helper并返回普通 Check。它仍负责 inherited environment、AbortSignal、process result、per-Check transcript、safe nonzero failure Record 和 unavailable reasons。command/args/environment 进入该 Check 的 typed options，而不是 Gate entry 的通用字段。

删除 helper 会复制这些行为；保留 helper不会限制其他 entry 使用直接 `defineCheck()`。测试必须同时证明 process helper 和一个 custom fixture Check 通过同一 Gate projection，而不是为 custom Check 再建 variant registry。

### 4. Gate policy 集中拥有 blocking selectors

普通 Check 可以拥有多个阻断或非阻断 Records。Gate entry presence 不应隐式把该 Check 的全部 Records 加入 blocking view。Project Definition 继续集中拥有 named policy 与 blocking selectors；process helper 的现有 command-failure selectors 可以从 catalog 机械投影，custom Record types 只有在该项目 policy 明确选择时才影响 policy。entry 不增加 policy contribution 字段。

adapter 仍要求每个 eligible Check 的 terminal verdict passed，因此 completed/failed 或 unavailable 无法通过最终 closure；非阻断 Record 可以与 passed verdict 并存。

### 5. 删除形成时数量锁，保留语义验证

移除 runtime 对 total `20`、required `14`、full `19` 的检查，并删除 focused test 中重复的数字断言。保留并验证：合法唯一 identity、已知 profile/tag、dependency existence/cycle、selection/dependency consistency、Definition projection与 final snapshot 对实际 catalog 的一一闭合。

当前数量继续由 catalog 与运行输出自然导出；历史 readiness handoff 如实保留形成时 `20/14/19`，但不再是未来添加 Check 时必须手工修改的运行时规则。

### 6. 项目内添加说明保持短且直接

[`docs/script-tooling.md`](../../docs/script-tooling.md#候选-project-gate) 增加一个简短“添加 Project Gate Check”入口，说明：选择普通 `defineCheck()` 或 local `processCheck()`、声明 profile/tags、必要时更新 project policy，并运行focused tests 与受影响 profile。完整 public Check API 说明由 npm/public API documentation Change拥有，项目文档只链接而不复制。

### 7. 本 Change 刷新发布前 Gate evidence，不重做 cutover

Gate implementation、tests 与 owner 变化后，cutover handoff 的 binding 事实仍成立，但其中形成时 manifest/candidate behavior evidence 不再代表发布候选。本 Change 必须等待 [`complete-typed-record-authoring`](../complete-typed-record-authoring/)、[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 与 [`ship-public-package-api-documentation`](../ship-public-package-api-documentation/) 收敛首次公开 package inputs；随后重新准备或安全复用 matching candidate、校验 installed entry，并通过正式 root entry 运行 focused/candidate tests、required/full 与 partial eligibility smoke。

本 Change 写出 <code>gate-optimization-handoff.md</code>，绑定 current Gate implementation、documentation-complete exact artifact、正式 root/CI binding、required/full 结果和重新验证条件。publish 同时消费该 handoff与 cutover 的 <code>gate-handoff.md</code>。

## Risks / Trade-offs

- **Wrapper identity：** eligibility wrapper 若复制或丢失 options/recordTypes/scheduling，会重新形成第二 Check；prototype 必须证明同一 value projection。
- **泛型擦除：** heterogeneous Check collection 在 Gate private mapping处会拓宽类型；实现必须只在可信 composition boundary 做必要泛型桥接，不能用 unchecked assertions掩盖 callback/options mismatch。
- **Policy 漂移：** process failure selector 的机械投影与 custom Record policy 必须保持项目 owner 清楚，不能默认所有 Records 阻断。
- **Evidence invalidation：** Gate implementation/content manifest 变化不会撤销 cutover，但公开发布前必须以 current exact artifact 刷新 Gate evidence。
- **过度抽象：** `processCheck()` 只提取 20 个现实 command Checks 共享的 process semantics，不扩展为 npm public process framework。

## Open Questions

无。Plan readiness 只需用最小 TypeScript prototype 确认 heterogeneous public `Check` values 经 eligibility wrapper 后仍保留 options、Records、scheduling 与 callback 类型关系；这不会引入第二 authoring surface。
