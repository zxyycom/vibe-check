> **核心句：**本临时 delta spec 只描述未来 JSON Schema Check 的高层结果与安全边界；实现前必须基于实际依赖补齐契约。

## ADDED Requirements

### Requirement: Schema-to-instance relationships are explicit

JSON Schema Check SHALL validate only schema resources and instance bindings explicitly declared through the resolved Project Definition. It SHALL NOT infer bindings from filenames, directory adjacency or discovery order.

#### Scenario: No binding is declared

- **WHEN** JSON files exist but the Project Definition does not declare a schema-to-instance binding for them
- **THEN** the JSON Schema Check does not invent or execute that relationship

### Requirement: Schema and instance problems are locatable domain results

The check SHALL distinguish schema, reference, binding and instance validation problems sufficiently for users to identify the affected project resource, and SHALL emit them as final `QualityRecord` values with a separate final `CheckResult`. Exact record types and fields MUST be fixed during the blocking implementation audit.

#### Scenario: An instance violates its declared schema

- **WHEN** an explicitly bound instance does not satisfy its successfully resolved schema
- **THEN** the check emits an actionable record associated with the instance and available schema context without exposing validator-private objects

### Requirement: Reference resolution is offline and local-safe

Validation SHALL NOT require implicit network access. Reference resolution SHALL stay within the project resources and local resolution boundaries approved by the resolved Project Definition.

#### Scenario: A reference is remote or outside the approved boundary

- **WHEN** a schema reference cannot be resolved within the approved local resource set
- **THEN** the check refuses the unsafe or unavailable resolution and reports an honest result without fetching it from the network

### Requirement: Core remains schema-agnostic

Schema parsing, compilation, reference resolution and instance evaluation SHALL remain owned by the JSON Schema Check or its private dependency boundary. The Check/Record Core SHALL only validate and aggregate the common final contracts.

#### Scenario: A validator reports a domain-specific error

- **WHEN** the private validation boundary returns a schema-domain problem
- **THEN** the feature normalizes it before submission and Core does not inspect schema keywords or engine-specific error shapes
