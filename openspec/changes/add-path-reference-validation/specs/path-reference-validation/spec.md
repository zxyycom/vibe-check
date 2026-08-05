> **核心句：**本 delta spec 只定义未来 path reference check 的高层可观察结果与范围边界；精确语法和数据契约必须在实施前重新细化。

## Purpose

检查项目文本中的 project-local path references，使失效或越界引用能够以安全、可行动的项目相对结果被发现。

## ADDED Requirements

### Requirement: Check project-local references in approved text

Path reference check SHALL 只处理 resolved invocation 批准的文本输入，并 SHALL 识别实施前审计确认的 project-local reference 场景。对无法解析或无法指向预期项目对象的引用，runner SHALL 通过 `quality-records` 发布最终 record；shared Core SHALL NOT 解析文本路径或推断领域问题。

#### Scenario: A stale project reference is reported

- **WHEN** 获准文本包含一个按届时产品语义明确指向项目对象、但目标已经不存在的 reference
- **THEN** runner 发布可定位的最终 record，并使用安全的 project-relative 目标信息

### Requirement: Do not expand the resolved global scope

Runner SHALL NOT 因文本引用而扫描 resolved global scope 之外的文件。对于无法在允许项目范围内验证的引用，runner SHALL 停止目标访问并 MAY 发布安全的边界结果；它 SHALL NOT 递归扫描被引用目标的内容。

#### Scenario: A reference points outside the allowed scope

- **WHEN** 文本 reference 解析到 resolved global scope 之外
- **THEN** runner 不打开或扫描该目标，且任何结果都不包含范围外的 raw host path

### Requirement: Publish only safe project-relative path information

公开和持久 records SHALL 使用完成定位所需的 normalized project-relative source/target 信息或安全分类，并 SHALL NOT 包含项目根的宿主绝对值或范围外 raw path。具体 record types 与字段由实施前审计确定。

#### Scenario: Output is independent of the host checkout path

- **WHEN** 同一项目位于不同宿主绝对目录并产生相同 path-reference 问题
- **THEN** 两次结果都以项目相对信息定位，不暴露各自 checkout 的绝对根路径

### Requirement: Keep neighboring semantic owners separate

该能力 SHALL 通过 `quality-checks` 和 `quality-records` 接入，并从 `project-definition` 接收 resolved authoring。Markdown link destination 与 anchor SHALL 由 Markdown link check 拥有；import、module、package 和架构 dependency SHALL 不由本能力推断。本能力 SHALL NOT 固定共同 channel、gate 或 comparison 行为。

#### Scenario: A Markdown link destination has one owner

- **WHEN** 获准 Markdown 中的 path-like 内容属于 link destination
- **THEN** path reference check 不为同一 occurrence 重复发布 record，链接语义由 Markdown link check 处理
