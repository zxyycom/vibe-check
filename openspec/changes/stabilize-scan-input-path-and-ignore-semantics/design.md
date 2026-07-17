核心句：本 change 只在 `openspec/changes/stabilize-scan-input-path-and-ignore-semantics/` 下形成待审计临时计划，用于在实现前选择并稳定相对 `--changed-files` 输入路径基准与 fallback walker ignore 语义；它不影响现有其它文档或主规范。

## Context

当前 TypeScript/Bun consumer 把相对 `--changed-files` 选项值按 process launch cwd 定位并读取，而文件内 entries 作为 normalized project root 下的 project paths 使用。因此，同一 project root 从不同目录启动时，CLI 可能读取不同的列表文件。

Scan scope 优先运行 `git ls-files --cached --others --exclude-standard`，所以 primary collection 尊重 VCS ignore；Git command 失败时，fallback walker 只执行 include、exclude 与 generated-file 规则，不解析 VCS ignore。正在进行的产品化 change 必须保持这些 pinned 行为，不能顺带决定后续长期合同。

本 change 横跨 `cli-contract` 与 `scan-scope`，但尚无足够的调用者兼容数据或无 Git 环境样本来替用户选择长期语义。所有 artifacts 因而是待审计临时计划；Open Questions 未回答且阻塞级审计未完成前不得 apply。

## Goals / Non-Goals

**Goals:**

- 为相对 `--changed-files` 列表文件定位选择一个唯一、可文档化、可测试的路径基准。
- 为 Git-first collection 失败后的 fallback walker 选择一个唯一、可文档化、可测试的 ignore 级别。
- 让选定语义在正式产品入口、dogfood wrapper、core collection、owner 文档与定向测试中一致。
- 在改变现状前显式审计调用者兼容性、跨平台行为、维护成本与验证证据。

**Non-Goals:**

- 不改变 changed-files 列表中 entries 作为 project paths 的解释方式。
- 不改变 metrics、warnings、artifact/report shape、summary status 或进程状态映射。
- 不在本临时计划中修改代码、长期 docs、主 specs、当前产品化 change 或其它 change。
- 不把 ignore 解析扩展成新的通用规则引擎，也不在未选择 ignore parity 前引入依赖。

## Decisions

### Decision 1: 实现前设置阻塞级合同审计

第一个 task 必须审计并记录两个开放选择。只要任一问题未回答，后续实现、文档同步和行为测试任务都不得开始；artifact 状态 `done` 不代表门禁解除。

### Decision 2: 复用现有 capability owner

相对选项路径归 `cli-contract`，collection ignore 行为归 `scan-scope`。本 change 不创建与它们同义的新 capability；两个 delta 只表达“最终必须选择且一致应用”的 owner 边界。

### Decision 3: 保持非目标产品合同不变

无论最终选择哪个路径基准或 ignore 级别，changed-files entries 仍作为 project paths 使用，且 metrics、warnings、artifact/report、summary status 与进程状态映射保持不变。实现验证必须证明这些边界未被顺带改写。

### Decision 4: 路径基准采用二选一审计，不预设结论

- **兼容优先选项：launch cwd。** 保留当前相对选项值的读取方式，现有 wrapper 与直接调用者无需迁移；代价是同一 project root 的行为依赖启动位置，且列表文件路径与内部 project-path entries 使用不同基准。
- **项目一致性选项：normalized project root。** 相对选项值与 scan project context 对齐，从不同目录调用同一 project root 时结果更可预测；代价是依赖 launch-cwd 相对路径的现有调用者需要改参数或迁移文件。
- 绝对 `--changed-files` 路径在两个选项下都不重写；审计需用现有调用方式和定向 characterization 证据选择其一。

### Decision 5: Fallback ignore 采用二选一审计，不预设结论

- **兼容优先选项：维持 best-effort fallback。** 继续只应用 include、exclude 与 generated-file 规则，保持当前输出、依赖和失败面；代价是 Git 可用与不可用时 scope 可能不同，被 VCS ignore 的文件可能进入 fallback 结果。
- **一致性优先选项：实现 ignore parity。** fallback 支持与 primary Git collection 明确相同的 VCS ignore 范围，使 Git 可用性不再改变受支持 ignore 结果；代价是增加规则解析、跨平台路径、性能、错误处理和维护负担，也可能改变现有无 Git 环境的扫描集合。
- 审计需基于无 Git/失败 Git 样本、现有配置规则和维护成本选择其一；不能仅凭 artifact 创建推定 ignore parity。

## Risks / Trade-offs

- [未审计即实现会把开放问题伪装成合同] → tasks 首项设置阻塞门禁，并要求先把答案写入 Decisions、delta 与验证计划。
- [选择 project root 破坏依赖 launch cwd 的调用者] → 在决定前 characterization 正式入口与 wrapper 的相对路径用法，并给出迁移说明。
- [选择 launch cwd 保留位置相关行为] → owner 文档和 help/错误上下文必须明确该基准，测试覆盖从 project root 外启动。
- [选择 ignore parity 带来复杂解析与行为偏差] → 审计支持范围、跨平台 case 和失败行为，只实现被选合同所需的最小机制。
- [选择 best-effort 使 Git 与 fallback scope 不同] → 将差异作为显式合同记录，并验证 fallback 仍稳定执行 include、exclude 与 generated-file 规则。
- [并行产品化 change 尚未归档导致基线漂移] → apply 前重新读取已归档主 specs 和实际产品入口，不在本提案阶段改写其 artifacts。

## Migration Plan

1. 完成阻塞级审计：用 characterization 证据分别选择路径基准与 fallback ignore 级别，并把答案追加为 Decisions、删除对应 Open Questions、收敛 delta 中的条件分支。
2. 重新核对产品化 change 归档后的 `cli-contract`、`scan-scope` 与 owner docs，必要时只调整本 change 的 delta 以匹配最新 requirement 标题和完整内容。
3. 以小切面实现 CLI 路径选择及其定向测试，再实现 fallback ignore 选择及其定向测试；两者共享 project-path normalization 边界但不引入通用抽象。
4. 同步 CLI/scan-scope owner 文档与验证入口，运行产品 import、typecheck、lint、test、dependency、入口和 workspace required checks。
5. 若验证发现兼容风险不可接受，回退本 change 的实现提交并恢复审计前行为；主规范在验收及归档前不更新。

## Open Questions

1. 相对 `--changed-files` 列表文件路径最终以 normalized project root 还是 process launch cwd 为基准？在回答并记录前不得 apply。
2. Git-first collection 失败时，fallback walker 最终维持现有 best-effort 语义，还是实现经界定的 VCS ignore parity？若选择 parity，审计还必须同时界定支持的 ignore sources、precedence、path normalization 与失败行为；在回答并记录前不得 apply。
