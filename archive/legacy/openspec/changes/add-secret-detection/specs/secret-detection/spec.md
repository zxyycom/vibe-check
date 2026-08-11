> **核心句：**本临时 delta spec 只描述未来 Secret Detection Check 的高层产品结果和不可放宽的泄露边界。

## ADDED Requirements

### Requirement: Approved project content can be checked for likely secrets

Secret Detection Check SHALL inspect only content approved by the resolved Project Definition and SHALL emit actionable final `QualityRecord` values for supported likely-secret findings. The detector set and policy details MUST be established during the blocking implementation audit.

#### Scenario: A supported likely secret is detected

- **WHEN** approved project content matches a detector that the implemented check can evaluate reliably
- **THEN** the check emits a record that identifies the affected project source and provides safe remediation context

### Requirement: Public results never expose raw secret material

Raw candidate and matched secret material SHALL remain confined to the minimum invocation-memory lifetime needed for detection. Public records, check results, diagnostics, artifacts and human-readable output SHALL contain only reviewed redacted representations and SHALL NOT contain a reversible copy of the secret.

#### Scenario: A finding is published

- **WHEN** a secret finding is committed or rendered through any Product output
- **THEN** the user can locate the affected source without the raw secret being reproduced in that output

### Requirement: Completed records and execution coverage remain independent

Secret Detection SHALL use the foundation's independent Record and CheckRun lifecycles. A later execution failure SHALL NOT retract already committed valid records, and those records SHALL NOT cause unfinished domain work to be reported as complete.

#### Scenario: Detection fails after an earlier finding

- **WHEN** one valid redacted record has been committed and later check work fails
- **THEN** the record remains available and the owning CheckRun truthfully exposes the incomplete or failed execution state

### Requirement: Core remains unaware of secret semantics

Candidate extraction, detector evaluation, redaction and safe context construction SHALL stay inside the Secret Detection owner or its private dependency boundary. Core SHALL only validate and aggregate the common final contracts.

#### Scenario: A detector produces a domain result

- **WHEN** a detector identifies a supported secret class
- **THEN** the feature normalizes its final record and result before submission without requiring Core to inspect the candidate or detector type
