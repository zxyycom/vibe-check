> **核心句：**本临时 delta spec 只描述未来 JSON Check 的高层可观察结果；实现前必须基于已落地基础契约补齐细节。

## ADDED Requirements

### Requirement: Selected ordinary JSON inputs are validated strictly

JSON Check SHALL validate only the ordinary JSON inputs selected by the resolved Project Definition and SHALL apply one documented strict JSON interpretation consistently. It SHALL NOT make the Core understand JSON or independently expand project scope.

#### Scenario: Selected JSON is invalid

- **WHEN** a selected ordinary JSON input violates the supported strict syntax or a deterministic structural rule owned by this check
- **THEN** the JSON Check reports the domain problem instead of treating the file as successfully validated

#### Scenario: A JSON-like document belongs to another owner

- **WHEN** an input is classified as a Project Definition document or another supported JSON-like format rather than ordinary JSON
- **THEN** this check does not reinterpret that input as ordinary JSON merely because of its filename

### Requirement: JSON problems are actionable and locatable

Each reported JSON problem SHALL be emitted as a final `QualityRecord` with enough safe project-relative location information for a user to find the affected source. Exact record types, fields and identity rules MUST be settled during the blocking implementation audit.

#### Scenario: A syntax or structural problem is found

- **WHEN** the JSON Check can associate a detected problem with source content
- **THEN** its final record identifies the affected project input and the best supported source location without exposing parser-private data

### Requirement: JSON check execution remains separate from its records

The JSON Check SHALL return a final `CheckResult` independently from the zero or more records it emits. Domain defects, empty results and execution failures SHALL remain distinguishable according to the applied Check/Record foundation.

#### Scenario: Execution fails after records were committed

- **WHEN** the check has committed valid final records and later cannot complete normally
- **THEN** the records remain available while the owning CheckRun truthfully represents incomplete execution
