## ADDED Requirements

### Requirement: Simulated project fixture suite
The repository SHALL provide deterministic simulated project fixtures for CLI scan validation. The first suite MUST include fixture projects for TypeScript `.ts`, Go `.go`, Rust `.rs`, and Python `.py`, and each fixture MUST be small, readable, checked into the repository, and runnable by tests without network access or language package installation. JavaScript, JSX, TSX, and other language fixtures MUST NOT be included as first-suite supported fixture projects; they MAY appear only as unsupported ordinary-file inputs when a test is proving unsupported classification.

#### Scenario: First language fixtures exist
- **WHEN** a reviewer inspects the simulated project fixture suite
- **THEN** the suite contains project fixtures covering `.ts`, `.go`, `.rs`, and `.py` source files
- **AND** the fixtures do not require external dependency installation before `vibe-check scan` can read them

#### Scenario: Later language fixtures are excluded from the first suite
- **WHEN** a reviewer inspects the first simulated project fixture suite
- **THEN** the suite does not contain JavaScript, JSX, TSX, or other non-first-suite source files as supported fixture inputs
- **AND** any such files that appear for boundary testing are documented as unsupported ordinary-file inputs

#### Scenario: Fixture projects are deterministic
- **WHEN** CLI contract tests copy a fixture project into a temporary directory
- **THEN** repeated scans of that copied fixture use the same source layout and produce the same documented scan invariants

### Requirement: Fixture coverage boundaries
The simulated project fixture suite SHALL cover project-shape boundaries that affect scan scope and metrics behavior. The suite MUST include VCS ignore input, default excluded directory input, unsupported ordinary files, generated/vendor/cache boundaries, and at least one multi-language fixture.

#### Scenario: Scope boundary fixture covers exclusions
- **WHEN** the fixture suite is used by scan scope tests
- **THEN** at least one fixture contains files under default excluded directories such as `target`, `.venv`, `generated`, `vendor`, or cache paths
- **AND** expected invariants verify those files are not counted in scan scope

#### Scenario: Mixed fixture covers unsupported files
- **WHEN** the fixture suite is used by CLI contract tests
- **THEN** at least one fixture contains unsupported ordinary files
- **AND** expected invariants verify unsupported files count toward `scope.file_count` but not `scope.supported_file_count`

### Requirement: Fixture expected invariants
Each simulated project fixture SHALL have documented expected invariants used by tests. Expected invariants MUST focus on owner-defined behavior such as scope counts, supported file counts, measured languages, warning counts, gate status, diagnostics status, and JSON schema validation; fixtures MUST NOT be treated as a separate source of product semantics.

#### Scenario: Tests assert owner-defined behavior
- **WHEN** a CLI contract test scans a simulated project fixture
- **THEN** the test asserts documented invariants that trace back to CLI, scan scope, quality metrics, or output owner behavior

#### Scenario: Tests avoid full report snapshots
- **WHEN** a fixture scan produces JSON output
- **THEN** tests validate the JSON schema and selected stable invariants instead of comparing a full JSON snapshot unrelated to the owner contract

### Requirement: Warning threshold fixture support
The simulated project fixture suite SHALL support testing `file.too_many_lines` warning and gate behavior without requiring large checked-in source files. Tests MAY generate deterministic threshold stress files in temporary fixture copies, and generated test-only files MUST be scoped to the temporary copy rather than committed as fixture source.

#### Scenario: Blocking threshold is generated deterministically
- **WHEN** a test needs to verify the blocking `file.too_many_lines` branch
- **THEN** the test can create a deterministic source file with at least 800 total lines inside a temporary fixture copy
- **AND** the resulting scan verifies a blocking warning and failed gate

#### Scenario: Checked-in fixtures stay readable
- **WHEN** a reviewer inspects the fixture project source files
- **THEN** threshold stress content is not committed as a large checked-in source file solely to reach the warning limit

### Requirement: Fixture maintenance documentation
Simulated project fixtures SHALL be documented in the test maintenance materials. Adding, removing, or changing a fixture that affects stable tests MUST update the relevant test case ledger or `@case` mapping according to the repository testing workflow.

#### Scenario: Fixture-backed tests are traceable
- **WHEN** a fixture-backed CLI contract test is added or changed
- **THEN** the corresponding test case entry or `@case` marker identifies the proof target and fixture responsibility
