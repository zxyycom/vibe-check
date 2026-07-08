## ADDED Requirements

### Requirement: Language metric schema follows supported source set
JSON schema and examples SHALL declare only language metric identifiers that can be produced by the current supported source set. For the MVP supported source set, `metrics.languages[].language` MUST allow `go`, `python`, `rust`, and `typescript`, and MUST NOT declare `javascript` until JavaScript support is introduced by a later change.

#### Scenario: Schema language enum matches MVP support
- **WHEN** validation checks the `vibe-check.report.v1` schema
- **THEN** the language metric enum contains `go`, `python`, `rust`, and `typescript`
- **AND** the enum does not contain `javascript`

#### Scenario: Examples avoid later language identifiers
- **WHEN** validation checks JSON report examples
- **THEN** examples do not use `javascript` language summaries while JavaScript is outside the supported source set
