# Proposal

本 Plan 为 Check execution 增加稳定的 direct dependency 枚举，使后续 Check 可以批量检查所有显式上游终态而不依赖并发调度时序。

## Why

当前 `dependencies.get(checkId)` 可以安全读取一个已声明 direct dependency，但调用方必须在执行代码中再次维护 ID 列表。审计、汇总或批量后处理 Check 已经通过 `dependsOn` 明确声明全部上游，却不能从同一授权事实源枚举它们。

暴露“当前碰巧执行完的全局 Check 列表”会让结果受并行调度顺序影响，并绕过静态 dependency graph。需要的是显式 direct dependencies 的稳定列表，而不是 ambient execution history。

## Outcome

Check execution 可以调用 `dependencies.list()`，按稳定顺序读取全部已声明 direct dependency 的四态终态和可用 final data，并据此执行自己的检查或项目动作。列表不能授权 transitive/undeclared Check，也不能修改、重新执行或重新结算上游。

## Scope

### Intended Change

- 在公共 Check execution dependency reader 增加零参数 `list()`，返回当前 Check 的 normalized direct dependencies。
- 每项包含稳定 `checkId` 和完整只读 terminal outcome；`passed`/`failed` 保留 canonical final data，`not-applicable`/`unavailable` 保留 reason。
- 结果按 normalized dependency ID 顺序稳定、数组和嵌套值冻结；空依赖返回冻结空数组。
- 保留 `get(checkId)` 的精确授权、provider parser与错误语义；`list()` 不接受动态 selection，也不观察调度完成先后。
- 更新公共说明、类型材料、installed consumer evidence与语义 Cases。

### Resulting Impacts

- `CheckDependencies` 公共结构扩展，所有内部 fixture和手工 context构造必须提供 `list()`，或统一通过正式 factory构造。
- downstream Check可以对所有显式上游执行自己的 I/O或形成自己的 outcome，但不能写回 upstream facts；文档必须把“操作”限定在当前 Check责任内。
- 枚举完整 outcome会让 producer final data直接可读，consumer仍必须调用 producer parser恢复业务类型并验证兼容性。

## Success Criteria

- `dependencies.list()` 只返回 effective direct dependencies，继承后的依赖包含在内，transitive与未声明 Check永不出现。
- 列表顺序不受 scheduler并发、settlement先后或调用次数影响；零依赖稳定返回空数组。
- 四种 upstream status均可枚举，data/reason与 Core已结算事实一致且不可由 consumer修改。
- `get()` 现有成功、`dependency-not-declared`、`upstream-data-unavailable` 和 diagnostic行为保持兼容。
- package README/API机制、declarations、candidate与隔离 external consumer能发现并正确使用新能力。

## Affected Owners

- `src/check/check.ts`、`src/project-run/check-execution/dependencies.ts`：公共 reader contract与执行实现。
- `src/project-definition/check-tree/**`、scheduler和settlement相邻代码：normalized direct dependency顺序与终态事实来源。
- `src/index.ts` 与 package declarations：公共类型可达性。
- `README.md`、`docs/configuration.md`、`docs/api-mechanics.md`：consumer使用方式与权限边界。
- `docs/decisions/**`：显式 provider/direct dependency长期契约的扩展。
- `docs/testing/cases/**`、Product tests和external-consumer acceptance：四态、继承、顺序、冻结与package证据。
