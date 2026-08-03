## ADDED Requirements

### Requirement: TypeScript port traceability and parity proofs

Repository SHALL 为每个 translated source responsibility 与 formal adapter switch 提供
deterministic product-owned proofs。Checked-in corpora MUST 覆盖当前 TypeScript `.ts`、
declaration `.d.ts` 与 Rust `.rs` inputs。Migration differential tests MUST 对 pinned
Python/Lizard oracle 与 TypeScript port 比较 function inventory、全部 current normalized
`FunctionMetric` fields/order。Switch 后的 required validation MUST 使用 checked-in
source/expected results，且 MUST NOT 依赖 Python。

#### Scenario: Every translated responsibility is traceable

- **WHEN** reviewer 检查一个 translated source file
- **THEN** 可以恢复 pinned upstream revision/path 与适用 license treatment
- **AND** mapped translated tests 或 product differential fixtures 证明其 current
  responsibility

#### Scenario: Current language corpus preserves product fields

- **WHEN** 迁移期 pinned Python/Lizard 与 TypeScript port 分析同一 `.ts`、`.d.ts`、`.rs`
  corpus
- **THEN** function inventory、name、file、ranges、lines、parameter count、complexity
  source/value 与 order 没有未解释差异
- **AND** Go/Python/JSX/TSX 或 internal-only fields 不被断言为 product support

#### Scenario: Formal entry is Python-free after the switch

- **WHEN** formal current/baseline scan 处理 eligible TypeScript/Rust fixture inputs
- **THEN** product results 来自 repository-owned TypeScript module
- **AND** process/config evidence 证明未到达 Python/Lizard command、availability check 或 CSV
  parser

#### Scenario: Failure remains all-or-nothing

- **WHEN** controlled input 或 module behavior 阻止形成完整可信 result
- **THEN** fixture proof 观察到既有 normalized capability failure
- **AND** 没有 partial function set 被接受为成功

#### Scenario: Backend replacement does not migrate semantic config

- **WHEN** 相同 `.vibe-check/config.json` semantic fixture 分别运行 pre-switch baseline 与
  post-switch TypeScript backend
- **THEN** `checks.functions` thresholds、accepted-warning `checkId`、scope 与 report semantics
  保持相同
- **AND** fixture、runtime/generated schema 和 starter 不增加、删除或重命名 backend-specific
  project field
