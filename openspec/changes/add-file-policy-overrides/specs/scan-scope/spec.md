This delta spec applies resolved file policy only after the global inventory boundary; it is a temporary change artifact and has not passed its implementation audit.

## ADDED Requirements

### Requirement: Per-file policy narrows capability exact inputs

Scan scope SHALL 在 global include、exclude、generated-file与code-area rules形成normalized inventory之后，为每个inventory path解析immutable `ResolvedFilePolicy`，再将path与其policy交给Product-owned capability descriptors。每个descriptor MUST 只返回inventory的子集，并根据自身owned settings决定eligibility；任何override MUST NOT reinclude global inventory之外的path。

Current、baseline与Git-failure fallback MUST 对相同project-relative path使用同一个invocation-owned config snapshot、path normalization、override order与capability selector semantics。Exact-input及cache planning MUST 消费最终per-file policy，而不是重新读取raw override document。

#### Scenario: Two capabilities select the same file differently

- **WHEN** 一个inventory file的resolved policy允许capability A但禁用capability B
- **THEN** A的exact inputs MAY包含该file，B的exact inputs MUST排除该file
- **AND** 两个selector都不能加入inventory之外的path

#### Scenario: Baseline uses the same path policy

- **WHEN** current与baseline都包含同一normalized project-relative path
- **THEN**两侧以相同base/override snapshot解析该path
- **AND** comparison不会因baseline工作树位置或临时目录而改变override matching
