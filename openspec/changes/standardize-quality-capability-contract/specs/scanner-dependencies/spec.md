> **核心句：**本 delta 让backend failure只影响所属capability run，并让current与named references共享一次immutable dependency resolution。

## MODIFIED Requirements

### Requirement: Dependency failures remain normalized capability results

Eligible dependency 的 unavailable、execution、invalid normalized result与declared internal dependency failure SHALL分别产生closed actionable diagnostic。Adapter MAY在failure前emit已完成work units的records；failure MUST NOT撤销Core此前已经committed的records或自行决定public coverage、gate或process outcome。

Core SHALL根据exact-work plan、finished-work acknowledgements、record sink与adapter summary finalize failed`CapabilityRun`。Backend replacement、platform default或operational override不得改变record/run/policy contract。

#### Scenario: Dependency unavailable is distinguishable

- **WHEN**eligible capability的dependency不可用
- **THEN**run为failed并包含`unavailable`diagnostic
- **AND**failure不伪装成no-input、zero-result success或config parse error

#### Scenario: Backend failure preserves completed work

- **WHEN**adapter已有records被Core committed后execution failed
- **THEN**records保留且run报告remaining coverage
- **AND**dependency layer不固定gate或全局outcome

## REMOVED Requirements

### Requirement: One dependency snapshot serves current and baseline

**Reason**: `baseline`不再是唯一comparison reference，cache unit也迁移为capability exact work。

**Migration**: 使用新增的“One dependency snapshot serves current and named references”。

## ADDED Requirements

### Requirement: One dependency snapshot serves current and named references

一次Product invocation MUST解析至多一个typed dependency snapshot。Current与全部resolved named reference work MUST复用该snapshot；各inventory MAY独立决定eligibility和adapter invocation，但 MUST NOT重新读取environment、project config或platform defaults。

Capability cache key MUST只投影exact work identity、content fingerprint、`CapabilityPolicyProjection`、applicable reference和relevant backend/dependency identity。Executable、args、private backend output与全量project config MUST NOT进入public record/run或成为无关cache invalidation。

#### Scenario: Multiple references share operational resolution

- **WHEN**同一invocation对current、release和branch运行capability
- **THEN**三者使用同一dependency snapshot
- **AND**reference work不重新读取operational inputs

#### Scenario: Cache uses relevant inputs only

- **WHEN**exact work、content、capability policy、reference或backend identity变化
- **THEN**对应work-unit cache identity变化
- **AND**report text、acceptance reason或sibling setting不影响它
