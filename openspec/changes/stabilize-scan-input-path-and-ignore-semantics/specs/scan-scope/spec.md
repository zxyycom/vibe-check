核心句：本 change 只在 `openspec/changes/stabilize-scan-input-path-and-ignore-semantics/` 下形成待审计临时计划，用于要求 `scan-scope` 最终选择并一致应用 fallback walker ignore 语义；它不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Fallback ignore 策略唯一且显式
Scan scope 合同 SHALL 为 primary Git collection 失败后的 VCS ignore 处理定义且只定义一个策略：不解析 VCS ignore、只应用 include、exclude 与 generated-file 规则的 pinned best-effort fallback，或对 primary Git collection 所支持 VCS ignore 行为提供 parity 的明确受限 fallback。选定策略 MUST 在实现前由阻塞级审计记录，MUST 在每次运行 fallback collection 时一致应用，并 MUST 由 scan-scope owner 记录。此临时 delta 不选择任一策略。该选择 MUST NOT 改变 metrics、warnings、artifact/report shape、summary status 或进程状态映射。

#### Scenario: 审计记录唯一 fallback ignore 策略
- **WHEN** 阻塞级审计选择 best-effort fallback 或经界定的 VCS ignore parity 中的一个策略
- **THEN** 审计将唯一选择及其兼容影响记录到本 change 的 Decisions、收敛后的 delta 与 scan-scope owner 更新计划
- **AND** 未被选择的分支不进入实现合同

#### Scenario: 选择 best-effort 时保留明确差异
- **WHEN** 审计选择 best-effort fallback 且 primary Git collection 失败
- **THEN** fallback walker 只应用受合同支持的 include、exclude 与 generated-file 规则
- **AND** scan-scope owner 明确说明 fallback 不承诺 VCS ignore parity

#### Scenario: 选择 ignore parity 时应用受支持规则
- **WHEN** 审计选择经界定的 VCS ignore parity 且 primary Git collection 失败
- **THEN** fallback collection 排除被同一受支持 VCS ignore 合同匹配的 paths
- **AND** parity 的规则范围、跨平台路径与失败行为由收敛后的 design、delta 和测试共同界定

#### Scenario: 未回答 ignore 问题阻止实现
- **WHEN** fallback ignore Open Question 仍未回答或未持久化为决定
- **THEN** 阻塞级审计保持未完成
- **AND** 不得执行 fallback 行为、owner 文档或验收测试的实现任务
