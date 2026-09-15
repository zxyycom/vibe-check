# Design

本 Draft 以普通 Check 的 `execute` 为主线：`commandCheck` 可先从 direct dependencies 解析环境，再完成自己的命令，将完整结果加入原 execution context 后调用用户函数。[API 草图](api-sketch.md)只说明拟议形状。

## Context

- 当前 [command Check 指南](../../docs/guides/command-check.md)和 `src/package-checks/command-check/**` 拥有单次 no-shell 命令、environment/output policy、取消、预算与默认退出码结果。
- [普通 Check authoring](../../docs/guides/extending-check-lifecycle.md)拥有 `prepare`、`execute`、direct dependencies、Records、messages、signal 与四态结果。包装层应沿用它们的时序和结算语义。
- Gate 的结构化失败和 typed stdout provider 需要后置领域处理。[公共 command Check Decision](../../docs/decisions/provide-public-command-check.md)约束通用进程职责与 raw output 边界；[Gate Records Decision](../../docs/decisions/publish-owner-structured-process-check-records.md)约束 owner 投影。

## Goals / Non-Goals

目标是让 **Check-owned 的单次命令**复用 Product 进程生命周期：调用方可在启动前从 direct dependencies 解析环境，并在完成后用普通 `execute` 形成领域结果；省略两类函数时保留简单退出码模式。多步骤工具协议、非 Check 脚本与 Gate 的聚合/退出策略保持各自 owner。

## Decisions

### Intended Change

1. 保留公开 `commandCheck` 的 executable/arguments 输入和 ordinary Check 组合。其返回 Check 的 `execute` 由 Product 包装：完成命令后，将只读、有界的 `{ exitCode, stdout, stderr }` 加到原 `CheckExecutionContext`，再调用可选的用户 `execute`。公开字段命名和泛型尚待验收。
2. 后置函数只收到**正常结束、输出完整且有 numeric exit**的命令结果；startup、timeout、取消、signal、输出超限和 transcript failure 由 Product 结算。调用资格独立于默认退出码分类，避免把 numeric nonzero 误作输出完整的证明。
3. 用户函数返回普通 `CheckResult<Data>`，可读取 direct dependencies、使用 signal、返回 messages 并通过普通 reporter 报告 Records。它独自拥有领域终态；省略时使用当前 `{ exitCode }` 映射。本次不预设另一个 Record 转换或结果转换公共分支。
4. 增加可选的**pre-spawn environment resolver**：在普通 `prepare` 成功、direct dependencies 可读后，命令启动前调用；只提供解析环境所需的 options、project、dependencies 和 signal，不开放 Records reporter 或 raw child material。它返回当前 `CommandCheckEnvironment` 的闭合 exact/inherit policy，与静态 `environment` 二选一，不隐式合并；未提供时仍为 exact-empty。Product 在启动前验证、detach 并冻结返回 policy，再叠加现有固定 plain-text variables。resolver 不改变 executable、arguments、workingDirectory 或其它命令字段。

### Resulting Impacts

- Input/declarations、constructor validation、现有内部 `prepare` 复验、resolver 的准入/返回验证、wrapped execution、typed final data、`parseData`/handoff 与 callback 异常语义需一起核对。两种函数和闭包不进入 declarative options 或 fingerprint；resolver 只在本次 invocation 解析环境值，不把值写入 Check facts。
- `output: discard` 仍表示不持久化，但后置函数可读有界 child material；transcript 的**进程状态**与用户函数返回的 **Check 结果**需分清。Raw output 不自动进入 final data、Records、messages 或 machine output。
- 用户函数使用普通逐条 `records.report`。调用方可先完整验证安全投影再发布；若要求提交阶段也 all-or-none，需要另证批量事务能力。
- Gate 的 dependency-derived environment 可由 resolver 在 spawn 前解决；解析异常、非法 policy 或取消必须 fail closed，不退回静态/ambient 环境，也不得在诊断中泄露值。Gate 专属 transcript 字段不会自动迁入 Product。迁移范围确定后，同步相应 owner、用户指南、示例、类型和验收测试，并按项目规则进行独立文档反查。

## Risks / Trade-offs

这种包装覆盖 typed stdout、工具专属安全 Records、dependency-derived environment 与额外领域 I/O，却不会替可信 callback 自动脱敏、取消其未连接 signal 的工作或保证 Record 事务提交。直接 `Record[]` 转换和独立结果转换只有证明与普通 `execute` 不同的消费者义务时才考虑公开。

ast-grep 的 pinned-version 检查是 rule tests 的真实前置条件；将两步表达为 `dependsOn` 有语义依据，不需要版本 Check 的独立消费者。它仍是两步工具协议，不属于本 Change 的单命令包装；拆分后 `failed` 与 dependent `unavailable` 的调用级解释应由独立的 `make-run-check-aggregation-default-and-customizable` 审查，不为保持现有 aggregate 而否定合法依赖。

当前实现的默认分类优先保留 numeric nonzero exit，即使 process result 还有 timeout/max-buffer 等标记。新 callback 的完整性检查必须与旧默认分类分开；改变旧分类属于另一项可观察行为调整。

## Open Questions

1. 公开后置函数使用顶层 `execute` 还是 `afterCommand.execute`；如何让 typed final data、`parseData`/handoff 和无用户函数的 `{ exitCode }` 模式正确推断？
2. Environment resolver 的公开字段名、context 精确类型、throw/非法返回的稳定 unavailable reason，以及 Gate 专属 transcript 是否进入本次迁移验收？
3. 实施前审查当前公共 Decision 的 exit-only 范围，确定是否需要长期后继修订。
4. ast-grep 的 version/rule-tests 拆分可按自身语义独立审查；与 `make-run-check-aggregation-default-and-customizable` 的实施顺序是否有 Gate 验收依赖？两者不扩入本 Draft 的单命令 API。
