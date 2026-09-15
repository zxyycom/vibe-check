# Proposal

本 Plan 让 Project Run 从本次有效 Check 结果列表生成默认汇总，并允许调用方在本次 Run 使用同步函数替换该汇总。

## Why

每个 Check 已有终态结果；Run 也已拥有结算后的 Check snapshot 和聚合位置。但当前调用方必须填写完整的 `RunControls.checkAggregation` policy 才能得到汇总，省略时 `aggregate` 为 `null`。对只需汇总有效 Check 的调用方，这增加配置负担，也限制了调用方对 Check final data 的解释。

## Outcome

完成 Check settlement 的 `completed` / `output` Run 保留完整 `snapshot.checks` / `snapshot.records`，并对同一次 effective selection 得到的 Check 列表生成 `aggregate`。省略定制函数时，列表非空且全部 `passed` 才返回 `passed`，其余返回 `failed`；指定同步函数时使用其已验证的四态返回值。定制函数抛错或返回非法值使 `run` 的 Promise 拒绝，不改写已结算 Check facts。Gate 使用默认汇总并继续按自身规则映射退出码。

## Scope

### Intended Change

- 将旧 `checkAggregation` 闭合 policy 直接替换为接收只读有效 Check 列表的同步函数；默认折叠与函数使用同一列表。
- Product 在 settlement 后验证函数返回值，并将函数错误传播给调用方；Run 的其他失败仍按现有 `RunResult` 契约处理。
- 保留完整 snapshot 与现有 Run 分支职责；聚合只形成调用级 readback。

### Resulting Impacts

- `RunControls` 验证、公开类型与 package API inventory、结果默认值、聚合/effective-selection tests、示例和消费者说明须统一到新契约。
- 异常传播须越过当前 `executeValidatedRun` 的通用 catch，同时安全关闭诊断与 progress 输出；Gate 须报告拒绝的 Promise 并非零退出。
- 与新默认和 callback 冲突的 active Decision 须形成后继；Gate 的聚合说明、内部 owner 和用户材料须基于实际实现同步。

## Success Criteria

- 无定制函数时，非空且全部有效 Check `passed` 才得到 `aggregate: "passed"`；空列表及任何其他终态得到 `failed`，完整 snapshot 不变。
- 定制函数看到 canonical-ordered 的有效 Check facts，可返回四态；抛错和非法返回均使 `run` 拒绝，资源关闭，progress 不误报 Run 成功，普通 Run 失败结算不回归。
- Gate 的选中成员、报告与 exit mapping 经目标测试和 package consumer 验收证明；公开说明、Decision 和测试证据与新行为一致。

## Affected Owners

- Product API 与 Run：`src/project-run/**`、`src/index.ts`、`docs/api-mechanics.md`、`docs/development/project-run.md`、`docs/development/check-results.md`。
- Gate：`scripts/project/gate/**`、`docs/tooling/project-gate.md`。
- 随包使用材料、package 类型验收与长期判断：`docs/guides/callbacks.md`、`docs/guides/run-outputs.md`、`docs/examples/package-api/custom-check.ts`、`scripts/package/public-api-inventory.ts`、`scripts/package/candidate/external-consumer/type-acceptance.ts`、`docs/decisions/default-effective-check-aggregation-with-caller-local-callback.md`。
