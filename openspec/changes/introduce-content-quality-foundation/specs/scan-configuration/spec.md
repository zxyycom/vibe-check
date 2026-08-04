本 delta spec 仅把 selected configuration context 对机器契约的引用迁移到 v2；它是临时且未审计的 change artifact，不改变 semantic config v1 field tree，也不表示已获准实现。

## MODIFIED Requirements

### Requirement: Selected configuration context

Product Config SHALL 创建一个 readonly context，其中包含 resolved config、source（`default`、
`explicit` 或 `discovered`），以及 file-backed source 的 normalized absolute path。Console SHALL 在
dependency preflight 前报告简洁 provenance。Downstream scan stages SHALL 只消费 resolved config；
single-active machine v2 output SHALL 只按 Output owner 的显式 DTO 投影保持 selected config相关
public shape，不得把完整config、raw override或scannerdependency settings泄漏到machine contract。

#### Scenario: Default provenance is pathless

- **WHEN** neutral default 被选中
- **THEN** console 报告 `default (not persisted)`
- **AND** selection context 使用 pathless default source

#### Scenario: File-backed provenance identifies selected path

- **WHEN** explicit 或 discovered config 被选中
- **THEN** console 报告 source 与 normalized path
- **AND** downstream scan 使用该 context 中的 resolved config

#### Scenario: Machine v2 does not serialize the config context

- **WHEN** Output从scan result投影current machine v2 artifacts
- **THEN**只序列化Output schema明确拥有的config-derived fields
- **AND**selected source path、完整semantic document与operationaldependency snapshot不因context存在而成为public fields
