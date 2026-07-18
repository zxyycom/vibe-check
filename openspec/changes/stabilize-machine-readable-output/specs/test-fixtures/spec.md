本 delta 起草 current-product schemas、examples 与 consumer compatibility proof；当前 change 仅在 `openspec/changes/stabilize-machine-readable-output/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Current-product machine contract fixtures

Repository SHALL 在 `docs/examples/artifacts/` 提供 deterministic current-product examples，至少覆盖 complete passed、legitimate empty、complete warning、gate failed 与 runtime/completeness failed outcomes。每个 example MUST 使用 `vibe-check.metrics.v1` metrics identity；每个 warning line MUST 使用 `vibe-check.warning.v1` identity，并 MUST 通过生产使用的 schemas 与 cross-artifact invariant validator。Fixtures MUST 与 retired Rust `docs/examples/json/` 保持可辨识边界，并映射到实际 test path 与唯一 `@case` marker。

#### Scenario: Representative examples validate

- **WHEN** docs/product validation遍历 current-product artifact examples
- **THEN** complete、empty、warning、gate-failed 与 runtime-failed metrics 全部通过 metrics schema
- **AND** 对应 warning streams 逐行通过 warning schema且与 metrics channels deep-equal

#### Scenario: Mutated examples are rejected

- **WHEN** test fixture 注入 unknown version、缺失 required field、invalid enum 或 reordered/mismatched warning record
- **THEN** schema或 cross-artifact validation 确定性失败
- **AND** failure 指向具体 artifact、record index 与 contract violation

#### Scenario: Historical examples remain distinguishable

- **WHEN** reviewer 浏览 schemas、examples 或 navigation
- **THEN** current TypeScript artifact fixtures 与 retired Rust report fixtures具有不同路径和 ownership label
- **AND** validation 不用 retired example证明 v1 metrics contract

### Requirement: Machine consumer compatibility proof

Required workspace validation SHALL 通过正式 Product CLI 生成 v1 artifacts，再让 CI annotation、workspace verifier 与 dogfood consumer 读取这些 artifacts。Acceptance MUST 证明 consumer 接受有效 v1、拒绝 unknown/invalid versions，并且不依赖 console、Markdown 或 raw scanner output。Proof target MUST 记录实际 producer test、consumer test、fixture path 与唯一 `@case` marker。

#### Scenario: Formal entry and consumers share the contract

- **WHEN** acceptance 通过正式入口生成 current-product artifacts
- **THEN** producer schema validation、consumer parsing 与 cross-artifact assertions全部成功
- **AND** consumer 只访问 schema 声明的 stable fields

#### Scenario: Consumer rejects unsupported contract

- **WHEN** acceptance 将 metrics 或 warning identity 改为 unsupported version
- **THEN** repository consumer 报告 actionable incompatibility并失败
- **AND** 不回退到 console parsing或 best-effort shape guessing
