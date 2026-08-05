> **核心句：**本 delta 让每个 capability 只从一次 normalized inventory 投影 exact work，runner 不自行发现或扩大输入。

## ADDED Requirements

### Requirement: Capability descriptors build exact work from one inventory

Scan Scope SHALL按selected scan configuration的global include/exclude policy构造一次normalized project-relative inventory。每个requested capability的descriptor selector MUST只从该inventory、`CapabilityPolicyProjection`和applicable named reference inventory构造exact work；selector与runner MUST NOT重新遍历project root、重新解释include/exclude或把dependency-private filtering变成第二套scope。这里的`CapabilityPolicyProjection`是capability领域设置，不是用于gate的`DecisionPolicy`。

Current、named reference与Git-failure fallback SHALL 使用同一 selector semantics。Deleted reference-only path或其它non-current identity MAY作为explicit comparison/causal input，但不得成为runner自行发现新文件的入口。

#### Scenario: Non-code file reaches only declaring capabilities

- **WHEN** normalized inventory包含Markdown和TypeScript文件
- **THEN**每个descriptor只选择其声明支持的exact work
- **AND**加入Markdown capability不改变既有metric capability的输入集合

#### Scenario: Runner cannot expand scope

- **WHEN** runner获得exact work handles和受限reader
- **THEN**它只能读取plan批准的输入及显式internal dependency material
- **AND**不能通过project root递归或backend discovery重新加入excluded path
