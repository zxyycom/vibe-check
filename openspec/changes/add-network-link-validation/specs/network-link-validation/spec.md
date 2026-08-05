> **核心句：**本临时 delta spec 只描述未来 Network Link Check 的高层授权、结果与安全边界；实现前必须基于实际基础能力补齐契约。

## ADDED Requirements

### Requirement: Network validation is explicitly authorized and uses classified candidates

Network Link Check SHALL perform network work only when a validated declarative policy in the resolved Project Definition explicitly enables it. It SHALL consume external-link candidates from the Markdown link classification owner and SHALL NOT independently rediscover or reclassify Markdown links.

#### Scenario: Network policy is absent or disabled

- **WHEN** external links exist but the resolved Project Definition does not explicitly authorize network validation
- **THEN** the check performs no DNS, connection or request work

### Requirement: Every network action remains inside a secure bounded boundary

The implementation SHALL apply SSRF protections to each destination it may contact and SHALL avoid ambient credential propagation. Scheduler-managed functions SHALL reuse the shared Check task orchestration's bounded slots, named resources and per-task failure isolation; this SHALL NOT be represented as caller cancellation, public `AbortSignal`, Task timeout, hard termination, bounded drain or control over network operations privately started inside a Task.

#### Scenario: A destination violates the safe-egress policy

- **WHEN** a candidate or subsequent destination is normally classified as violating the implemented safe-egress policy
- **THEN** the check does not contact it and the producing Check may return a safe domain result

#### Scenario: The runtime cannot enforce the safe boundary

- **WHEN** the execution boundary cannot perform required network work while preserving the safe-egress policy
- **THEN** it does not contact the destination and returns an unavailable or execution-failed report under the foundation contract
- **AND** foundation does not create a quality result for that failed execution

### Requirement: Domain indeterminate and execution failure remain distinct

The check SHALL emit a confirmed-problem `QualityRecord` only when supported by the implemented confirmation policy. When all required work settles normally, the producing Check MAY express a still-uncertain remote state within its declared final QualityRecord and CheckResult contract and SHALL return a valid CheckResult; the owning CheckRun SHALL be completed. This domain `indeterminate` value SHALL NOT add a new foundation verdict or run status. Exact domain representation MUST be fixed during the blocking audit and SHALL NOT mislabel uncertainty as a confirmed broken link.

When orchestration returns execution-failed because required work, a Task or completion did not complete normally, foundation SHALL instead finalize a failed CheckRun with `result = null`. Previously committed valid records and acknowledged coverage SHALL remain available. The feature SHALL NOT create an `indeterminate` CheckResult or synthetic record for that same execution failure.

#### Scenario: Normal work returns an indeterminate domain outcome

- **WHEN** all required network work and completion return normally but the producing Check cannot confirm the remote condition
- **THEN** the producing Check may return final domain-indeterminate record/result semantics and the owning CheckRun is completed
- **AND** no confirmed broken-link record is invented

#### Scenario: Required execution fails after records were committed

- **WHEN** a Task or completion fails after valid records or coverage acknowledgements were committed and orchestration returns execution-failed
- **THEN** foundation finalizes a failed CheckRun with `result = null` while preserving those records and acknowledgements
- **AND** the feature does not also return an indeterminate CheckResult for that failure

### Requirement: Published network evidence is redacted

Public records, results, diagnostics and artifacts SHALL provide safe link context without exposing credentials, userinfo, sensitive query values, response bodies or other private transport material. Exact public fields and identity rules MUST be fixed during the blocking security audit.

#### Scenario: A confirmed problem is published

- **WHEN** the check emits a final record for a confirmed external-link problem
- **THEN** the user can identify the source occurrence and safe destination context without receiving protected request or response material
