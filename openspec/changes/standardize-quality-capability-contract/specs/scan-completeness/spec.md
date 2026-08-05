> **核心句：**本delta定义Core如何为每个capability finalize独立run/coverage，并明确run failure不撤销此前committed records。

## MODIFIED Requirements

### Requirement: Current capabilities produce one final result

Product Core SHALL 从compile-time registry取得完整capability集合，并为每项descriptor finalize且只finalize一个`CapabilityRun`。Status MUST为`skipped`、`no-input`、`completed`或`failed`；unknown、duplicate或missing run MUST使Core/machine validation失败。

`skipped` MUST表示未请求且未启动；`no-input` MUST表示已请求但selector产生zero exact work且未启动runner；`completed` MUST表示全部planned work finished；`failed` MUST表示work、dependency或record validation未正常完成，并包含closed actionable diagnostic。Failed run MAY保留failure前committed records。

每个run MUST包含non-negative integer `planned`、`finished`、`unprocessed`与`committedRecordCount`，并满足`planned = finished + unprocessed`。Core SHALL依据resolved plan、finished-work acknowledgements和record sink count finalize coverage；capability runner不得自行声明public planned/unprocessed/committed counts。

#### Scenario: Requested capability has no work

- **WHEN**policy请求capability但selector产生zero exact work
- **THEN**run为`no-input`且coverage/record counts为zero
- **AND**Product不启动runner或dependency

#### Scenario: Failed capability retains records

- **WHEN**capability完成部分work且records已committed后execution failed
- **THEN**run为`failed`并报告finished/unprocessed coverage和diagnostic
- **AND**`committedRecordCount`继续计入failure前保留的records

## REMOVED Requirements

### Requirement: Overall completeness controls result trust

**Reason**: 固定overall reducer把record validity、capability coverage和最终产品决策压成一个结论，并使一个capability failure覆盖其它有效数据。

**Migration**: Output并排发布每项`CapabilityRun`与committed records；是否要求完整coverage由`quality-decision-policy`显式组合run operands。

## ADDED Requirements

### Requirement: Run status and record validity remain independent

Core、Output和consumer MUST把“record已验证”与“capability work已完整覆盖”作为两个独立事实。Record存在只证明该条数据有效；completed run只证明planned work全部finished。任何展示partial-run records的surface MUST同时展示或关联producing run status与coverage。

Capability run status MUST NOT自动删除records、改写record level、产生synthetic finding或决定gate/process outcome。Selected decision policy MAY组合任意run status和coverage条件。

#### Scenario: Partial evidence remains visible

- **WHEN**一个run failed且含committed records，另一个run completed
- **THEN**machine与human output并排保留两个runs及全部committed records
- **AND**是否阻断只由selected policy决定
