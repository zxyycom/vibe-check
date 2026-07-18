# test-fixtures Specification

## Purpose
定义 TypeScript/Bun 产品测试资产和 support fixtures 的仓库所有权、adapter boundary、
证明目标追溯与 testing owner materials 维护规则，确保测试只观察当前产品契约。
## Requirements
### Requirement: TypeScript product test assets remain traceable

Vibe Check product unit tests 与 unit support fixtures SHALL 由 `src/product/**` 拥有，并且 SHALL 只证明当前 owner 定义的 TypeScript / Bun behavior。迁移后的 quality-core tests 与 unit support fixtures MUST 保留在 `src/product/quality-core/**`。可由正式入口扫描的 reusable external project fixtures SHALL 位于 `fixtures/projects/**`，并与 unit / scanner protocol support 保持可辨识边界。Testing owner materials MUST 将已记录的 proof target 映射到实际 test path、fixture path 与唯一 `@case` marker。Scanner protocol samples 与 controlled tools MAY 作为 acceptance support，但 MUST NOT 定义稳定 Core 或 Output contract。

#### Scenario: Product proof targets are auditable

- **WHEN** reviewer 从 testing owner materials 检查已记录的 TypeScript product proof
  target
- **THEN** case entry 指向实际 test path 与对应 fixture path
- **AND** 对应源码保留唯一 `@case` marker

#### Scenario: External project fixtures remain distinct

- **WHEN** 正式入口 acceptance 需要 checked-in 可扫描项目
- **THEN** project fixture 位于 `fixtures/projects/**`
- **AND** unit support、scanner protocol material 与 external project source 保持清楚边界

#### Scenario: Scanner support stays test-owned

- **WHEN** acceptance 使用 controlled scanner command 或 protocol sample
- **THEN** assertion 证明 Vibe Check-owned config routing、normalized model 或 failure
  projection
- **AND** scanner-private output shape 不成为稳定 Core 或 Output contract

### Requirement: Configured external project fixture

Repository SHALL 在 `fixtures/projects/configured-typescript/` 提供最小、deterministic、checked-in project，包含完整 JSON `QualityConfig`、eligible TypeScript source、excluded / generated controls、可产生现有 warning 的 source 与 fixture README。Fixture-backed acceptance MUST 通过正式 Product CLI 显式传入 project root 与 `--config`，并验证 config version、effective scope、code area、warning 与 artifacts。Fixture config MAY 使用 controlled tool settings 保证测试确定性。

#### Scenario: Formal entry scans according to fixture config

- **WHEN** acceptance 从 fixture root 外启动
  `bun run product:cli -- scan <fixture-root> --config vibe-check.config.json`
- **THEN** metrics 只包含 config 批准的 files，并使用 config 声明的 code area 与 version
- **AND** warning 与 artifacts 对应 explicit config 而不是 `DEFAULT_CONFIG`

#### Scenario: Excluded fixture inputs remain excluded

- **WHEN** fixture 同时包含 eligible source 与匹配 exclude / generated rules 的 controls
- **THEN** eligible source 进入 normalized scanner inputs
- **AND** excluded / generated files 不进入 metrics、warnings 或 scanner exact inputs

#### Scenario: Acceptance remains deterministic

- **WHEN** required product validation 重复运行 configured fixture acceptance
- **THEN** controlled tools 产生稳定 Vibe Check-owned metrics、warning ordering 与 artifacts
- **AND** acceptance 不依赖网络或未固定第三方 output
