## MODIFIED Requirements

### Requirement: LOC metrics adapter input
Core scan pipeline SHALL run a LOC metrics adapter after scan scope collection and before warning generation. The adapter MUST receive only collected supported files from the normalized scan scope, and MUST NOT measure files excluded by scan scope rules or files classified as unsupported. MVP supported metric inputs are TypeScript `.ts`, Go `.go`, Rust `.rs`, and Python `.py` files.

#### Scenario: Supported files are measured
- **WHEN** a project root contains collected supported files in TypeScript, Go, Rust, or Python
- **THEN** the LOC metrics adapter produces normalized file metrics for those supported files

#### Scenario: Unsupported files are not measured
- **WHEN** a project root contains collected unsupported files such as Markdown, JavaScript, JSX, or TSX
- **THEN** unsupported files are included in `scope.file_count` but do not produce LOC metrics records

#### Scenario: TypeScript declaration files are measured as TypeScript
- **WHEN** scan scope provides collected supported file `src/types.d.ts`
- **THEN** the LOC metrics adapter treats it as TypeScript input

### Requirement: Normalized LOC metrics
LOC metrics SHALL be normalized into Vibe Check-owned models before aggregation. MVP file metrics MUST include file path, normalized language, total lines, code lines, comment lines, and blank lines for each measured supported file. MVP language identifiers MUST be `go`, `python`, `rust`, and `typescript`.

#### Scenario: File metrics use Vibe Check model
- **WHEN** the LOC adapter measures `src/lib.rs`
- **THEN** Core receives a Vibe Check file metrics record rather than a third-party native report structure

#### Scenario: Language names are normalized
- **WHEN** supported files are measured
- **THEN** their language values are normalized to stable Vibe Check language identifiers `go`, `python`, `rust`, or `typescript`
