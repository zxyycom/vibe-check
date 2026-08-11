> **核心句：**本 delta 只定义 future backend replacement 的高层结果；它尚未通过实现前审计，也不把历史 Lizard baseline 固定为当前契约。

## MODIFIED Requirements

### Requirement: Function metrics backend boundary

Structural scanning SHALL 最终使用 Product-owned TypeScript implementation 为 `function-metrics` built-in Check 提供领域 measurement data 或 typed execution failure。Formal product execution MUST NOT 要求启动或解析外部 Python/Lizard runtime；backend-private parser state 与迁移材料 MUST 保持在 structural-scanning boundary 内。

Backend replacement MUST 保持实施前阻塞审计所确认的 current supported-input、CheckResult、QualityRecord、identity、ordering 与 failure behavior。该审计 MUST 在三个基础 change 和 TypeScript Project Definition 落地后重新从主规范、源码和可重复运行采集契约，不得把本 change 的历史观测当作 current baseline。

#### Scenario: Formal function check no longer depends on Python or Lizard

- **WHEN** 完成后的 `function-metrics` Check 分析其 resolved supported inputs
- **THEN** structural-scanning boundary 使用 Product-owned TypeScript implementation
- **AND** product execution 不查找、启动或解析外部 Python/Lizard runtime

#### Scenario: Backend replacement preserves the fresh product baseline

- **WHEN** implementation audit 定义的 compatibility corpus 分别由切换前后的 formal function-metrics path 处理
- **THEN** observable CheckResult 与 QualityRecord behavior 满足审计确认的 parity contract
- **AND** port 不借 backend replacement 扩大 supported inputs 或增加新的 public result semantics

#### Scenario: Parser failure follows the current Check execution contract

- **WHEN** TypeScript backend 无法形成可信的 function-metrics execution contribution
- **THEN** `function-metrics` Check 按届时 `quality-checks` contract 报告 execution failure
- **AND** Record publication 遵循届时 `quality-records` contract，不把失败伪装成成功结果或构造无依据记录
