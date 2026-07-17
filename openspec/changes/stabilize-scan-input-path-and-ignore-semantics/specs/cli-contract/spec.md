核心句：本 change 只在 `openspec/changes/stabilize-scan-input-path-and-ignore-semantics/` 下形成待审计临时计划，用于要求 `cli-contract` 最终选择并一致应用相对 `--changed-files` 输入路径基准；它不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: 相对 changed-files 输入路径基准唯一且一致
CLI 合同 SHALL 为相对 `--changed-files` 列表文件路径定义且只定义一个解析基准：normalized project root 或 process launch cwd。选定基准 MUST 在实现前由阻塞级审计记录，MUST 由正式产品入口与 dogfood wrappers 一致应用，并 MUST 由 CLI owner 记录。此临时 delta 不选择任一基准。绝对列表文件路径 MUST 保持绝对路径；从列表中读取的 entries MUST 继续作为 project paths 解释，而不是相对于列表文件解释。该选择 MUST NOT 改变 metrics、warnings、artifacts、summary status 或进程状态映射。

#### Scenario: 审计记录唯一相对路径基准
- **WHEN** 阻塞级审计选择 normalized project root 或 process launch cwd 中的一个基准
- **THEN** 审计将唯一选择记录到本 change 的 Decisions、收敛后的 delta 与 CLI owner 更新计划
- **AND** 未被选择的分支不进入实现合同

#### Scenario: 所有入口使用已选基准
- **WHEN** 调用者通过正式产品入口或 dogfood wrapper 传入相对 `--changed-files` 列表文件路径
- **THEN** CLI 从审计选定的唯一基准定位同一个语义上的列表文件
- **AND** wrapper 不引入第二套隐式 rebasing 规则

#### Scenario: 绝对列表路径与 project-path entries 保持边界
- **WHEN** 调用者传入绝对 `--changed-files` 列表文件路径且文件包含 project-relative entries
- **THEN** CLI 不重写该绝对列表文件路径
- **AND** entries 继续作为 normalized project root 下的 project paths 交给 scan scope

#### Scenario: 未回答路径问题阻止实现
- **WHEN** 路径基准 Open Question 仍未回答或未持久化为决定
- **THEN** 阻塞级审计保持未完成
- **AND** 不得执行路径行为、owner 文档或验收测试的实现任务
