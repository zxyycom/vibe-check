> **核心句：**本 delta spec 只定义未来 Markdown structure check 的高层可观察结果；精确规则与数据契约必须在实施前重新细化。

## Purpose

为项目 Markdown 提供开箱即用的结构与可读性检查，使明显影响阅读和维护的问题能够作为标准质量 records 被发现和消费。

## ADDED Requirements

### Requirement: Check only approved Markdown input

Markdown structure check SHALL 只处理 resolved check invocation 批准的 Markdown 输入。Markdown 解析、结构判断和领域结果 SHALL 由该内置 CheckRunner 拥有，shared Core SHALL NOT 解析 Markdown 或推断结构问题。

#### Scenario: Unapproved content remains outside the check

- **WHEN** 本次 invocation 只批准一组 Markdown 文件
- **THEN** runner 只检查这些输入，不读取其它文件来扩展扫描范围

### Requirement: Publish actionable structure records

当获准 Markdown 存在已启用规则所覆盖的结构或可读性问题时，runner SHALL 通过 `quality-records` 发布可理解且可定位的最终 records；当检查正常完成且没有此类问题时，CheckRun MAY 合法地完成并产生零条问题 record。具体规则集合、record types 与字段由实施前审计确定。

#### Scenario: A structural problem is reported at its source

- **WHEN** 文档包含实施时已确认规则认定的标题层级或内容组织问题
- **THEN** check 完成领域判断并发布指向相关项目文件位置的最终 record

#### Scenario: A healthy document needs no synthetic record

- **WHEN** 文档满足本次 resolved policy
- **THEN** check 正常完成，且 Core 不为“通过”强制制造一条问题 record

### Requirement: Use shared Check and Record contracts

该能力 SHALL 通过 `quality-checks` 表达 check 定义、运行与结果，通过 `quality-records` 提交最终领域数据，并从 `project-definition` 接收项目 authoring 的 resolved 输入。Shared policy MAY 消费最终 Check/Record 快照，但本能力 SHALL NOT 固定共同 channel、gate 或 comparison 行为。

#### Scenario: Core consumes the feature without Markdown branches

- **WHEN** Markdown structure runner 提交合法 records 并返回 check result
- **THEN** shared managers 按共同契约完成运行和 records 快照，不需要 Markdown 专用解析或结果重判分支
