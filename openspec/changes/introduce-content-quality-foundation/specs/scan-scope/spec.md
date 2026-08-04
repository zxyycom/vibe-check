本 delta spec 定义 normalized inventory 到 capability exact inputs 的单向投影；它是临时 change artifact，尚未完成实现前审计。

## ADDED Requirements

### Requirement: Normalized inventory projects capability-specific exact inputs

Scan scope SHALL 先按 selected global include、exclude directories、generated-file rules 与 code-area classification 形成一次 normalized inventory，再由 Product-owned capability descriptors 分别选择 exact inputs。Capability selection MUST 是 inventory 的子集投影；per-capability settings MAY 缩小但 MUST NOT 扩大 global inventory。Current、baseline 与 Git-failure fallback MUST 使用同一 selector semantics 与 resolved policy snapshot。

#### Scenario: JSON validation does not imply JSON code metrics

- **WHEN** global inventory 包含一个 JSON 文件，JSON capability selector 接受它而 code-metric selector 不接受它
- **THEN** JSON exact inputs 包含该文件
- **AND** file/function/duplicate exact inputs 不会仅因 global inclusion 自动包含该文件

#### Scenario: Capability selector cannot restore excluded input

- **WHEN** 文件被 global exclude 或 generated-file rule 从 normalized inventory 移除
- **THEN** 任一 capability selector 都不能重新加入该文件
- **AND** current、baseline 与 fallback 保持同一结果
