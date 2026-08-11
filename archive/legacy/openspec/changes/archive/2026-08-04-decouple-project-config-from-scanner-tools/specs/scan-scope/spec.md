## MODIFIED Requirements

### Requirement: Real project file collection

Core scan pipeline SHALL 从 normalized project root 与 selected semantic config 的 include paths 构造 scan scope。Selected document 必须先通过 Product Config runtime contract 并归一化为 invocation-owned config；collection 不得读取 scanner dependency settings。Collection MUST 先运行 `git ls-files --cached --others --exclude-standard` 取得候选 paths；该命令失败时 SHALL 保持现有提示并使用当前 fallback walker。Git、fallback、current 与 baseline MUST 使用同一 resolved semantic scope 和 code-area classification。

#### Scenario: Git collection uses selected include paths

- **WHEN** Git collection 成功且 selected semantic config include paths 匹配 ordinary project files
- **THEN** core 从 Git 返回的 candidate paths 构造 scope
- **AND** 只保留符合同一 resolved scope rules 的 paths

#### Scenario: Explicit config changes candidate eligibility

- **WHEN** explicit semantic config 的 include paths 与 built-in semantic config 不同
- **THEN** collection 使用 explicit config include paths
- **AND** built-in include paths 和 scanner dependency settings 不参与 scope

#### Scenario: Git failure keeps selected config

- **WHEN** current 或 baseline Git collection command 失败
- **THEN** core 保持现有提示并使用 fallback walker
- **AND** fallback 复用 invocation 开始时解析的同一个 semantic config snapshot

### Requirement: Default exclusion baseline

Scan scope collection SHALL 在构造 scanner exact inputs 前应用 selected semantic config 的 exclude directories、generated-file globs 与 code-area boundaries。使用 built-in config 时 MUST 保持 current default scope behavior；使用 explicit 或 external-workflow-discovered config 时 MUST 只应用该 selected document 解析出的 public scope，不得同时应用 built-in exclusions 或 dependency-private filtering rules。

#### Scenario: Selected exclusions do not reach scanner inputs

- **WHEN** candidate path 匹配 selected semantic config 的 excluded directory 或 generated-file rule
- **THEN** 该 path 不进入 normalized scanner exact inputs
- **AND** dependency resolver 或 adapter 不得通过自行遍历重新加入该 path

#### Scenario: Explicit config does not inherit hidden exclusions

- **WHEN** path 匹配 built-in exclusion，但满足 selected external include 且不匹配 selected external exclude / generated rule
- **THEN** 该 path 保持 eligible
- **AND** core 不把 built-in 或 backend-private exclusion 与 selected semantic config 合并
