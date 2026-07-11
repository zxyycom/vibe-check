本 delta 定义 structural scanning 所需的 fixture proof targets；当前只在已完成阻塞级实现前审计的 change 目录中形成临时变更计划，归档前不修改现有 `test-fixtures` 主规范，也不表示当前 binary 已具备这些 proof targets。

## ADDED Requirements

### Requirement: Structural scanner characterization fixtures
Checked-in fixture suite SHALL 为 `ast-grep-core` / `ast-grep-language` dependency characterization 和 Vibe Check structural adapter 提供 deterministic、hand-written、offline proof targets。Fixtures MUST 覆盖 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`，MUST 能证明 supported function forms、source ranges、stable names、parameter slot semantics、receiver exclusion 和 deterministic ordering，且 MUST NOT 需要 network access 或 language package installation。

#### Scenario: 四种语言具有结构扫描 proof targets
- **WHEN** dependency characterization tests 读取 checked-in structural fixtures
- **THEN** fixtures 包含 TypeScript、Go、Rust 和 Python 的 supported named function / method forms
- **AND** tests 能证明每种语言的 name、kind、source range 和 parameter count mapping

#### Scenario: Receiver 与复合参数具有明确 fixture
- **WHEN** adapter tests 验证跨语言 parameter count semantics
- **THEN** fixtures 包含 Go、Rust、TypeScript 和 Python receiver forms
- **AND** fixtures 包含 default、optional、destructured、rest 或 variadic parameter 的代表性输入

#### Scenario: Parser 与路径边界使用 checked-in input
- **WHEN** adapter tests 验证 syntax error、UTF-8 path 或 declaration-only source
- **THEN** 对应 source 与路径作为 checked-in fixture 存在
- **AND** 测试不在运行时生成、复制、追加或改写这些 scan inputs

### Requirement: Function warning project fixtures
Checked-in project fixtures SHALL 至少包含一个 `parameter_count >= 5` 的 supported function 和一个 `parameter_count < 5` 的 supported function，用于证明 `function.too_many_parameters` 的 warning threshold、human / JSON projection 和 non-blocking gate behavior。Warning-triggering source MUST 手写并提交到仓库，测试 MUST 直接扫描 checked-in project path。

#### Scenario: 达到阈值的 function 可从真实 CLI 观察
- **WHEN** CLI contract test 扫描 function warning fixture
- **THEN** human 与 JSON report 都包含可定位的 `function.too_many_parameters` warning
- **AND** JSON report 通过现有 owner schema 校验
- **AND** function-only warning 不让 gate failed

#### Scenario: 低于阈值的 function 不产生该 warning
- **WHEN** 同一 checked-in fixture 中的 supported function 只有四个 normalized parameters
- **THEN** report 不为该 function 生成 `function.too_many_parameters` warning

### Requirement: Structural fixture ownership remains traceable
新增或修改 structural characterization、adapter 或 CLI fixture-backed tests 时，testing owner materials SHALL 记录 proof target、fixture responsibility、planned / implemented status 和唯一 `@case` mapping。Fixture metadata MUST NOT 重新定义 function model、parameter threshold、diagnostic 或 gate semantics。

#### Scenario: Structural test case 与 owner contract 对账
- **WHEN** structural fixture-backed test 被新增、拆分或修改证明目标
- **THEN** `docs/testing/cases.md` 和对应源码 `@case` marker 按测试维护流程同步
- **AND** case entry 将产品语义追溯到 structural scanning 或 quality metrics owner contract
