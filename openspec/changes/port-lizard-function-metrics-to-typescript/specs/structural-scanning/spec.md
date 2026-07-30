## MODIFIED Requirements

### Requirement: Function metrics backend boundary

Structural scanning SHALL 使用 repository-owned、pinned Lizard-compatible TypeScript
function-metrics module。Adapter MUST 只接收当前 product contract 从 normalized scan scope
选出的 inputs：TypeScript `.ts`（包括 `.d.ts`）与 Rust `.rs`。它 MUST 调用一个 internal
typed API，并把完整结果映射为当前 Vibe Check-owned `FunctionMetric` records 或既有
normalized capability failure。Formal current/baseline scans MUST NOT 解析或启动 external
Python/Lizard，也不得解析其输出。

#### Scenario: Current TypeScript and Rust inputs use the internal module

- **WHEN** current 或 baseline function-metrics scan 接收 eligible `.ts`、`.d.ts`、`.rs`
  exact inputs
- **THEN** adapter 调用 repository-owned TypeScript module，且不重新发现文件
- **AND** normalized fields 与 deterministic ordering 满足当前 product contract

#### Scenario: Unsupported language scope does not expand

- **WHEN** normalized scan scope 包含 Go、Python、TSX、JavaScript、JSX 或其它 unsupported
  file
- **THEN** current selector 不把它交给 function-metrics analysis
- **AND** backend replacement 不创建新 language capability

#### Scenario: External Python/Lizard cannot change results

- **WHEN** PATH 包含不同 Lizard version，或没有 Python/Lizard installation
- **THEN** 同一 product revision 与 inputs 仍由 pinned TypeScript module 产生结果
- **AND** dependency availability 不再控制 function-metrics eligibility

#### Scenario: Untrustworthy module result fails the capability

- **WHEN** file reading、decoding、parsing、module invariant 或 normalization 阻止形成完整可信
  function set
- **THEN** adapter 返回既有 normalized `function-metrics` capability failure
- **AND** partial functions 不作为成功 output 发布
