## ADDED Requirements

### Requirement: Current product ownership notices
Human-readable reports SHALL retain top and footer non-blocking development snapshot notices while naming the TypeScript/Bun product as the current release-contract owner. The top notice MUST identify the TypeScript/Bun product CLI, report contract, and product tests as the release contract. The footer notice MUST identify TypeScript/Bun product tests and contract validation as the release gates. Neither notice SHALL identify the retired Rust CLI, Rust schema, or Rust tests as the current owner. Updating these notices MUST preserve artifact shape, fields, status, section ordering, report structure, and machine-readable output.

#### Scenario: Top notice names the current release contract
- **WHEN** a human-readable quality report renders its top non-blocking notice
- **THEN** the notice names the TypeScript/Bun product CLI, report contract, and product tests as the release contract
- **AND** it does not name the retired Rust CLI, schema, or tests as the current release contract

#### Scenario: Footer notice names the current release gates
- **WHEN** a human-readable quality report renders its footer notice
- **THEN** the notice names TypeScript/Bun product tests and contract validation as the release gates
- **AND** it does not name Rust tests or Rust schema validation as the current release gates

#### Scenario: Notice replacement preserves report contracts
- **WHEN** both current-product notices replace the retired Rust notices
- **THEN** artifact shape, fields, status, section ordering, report structure, and machine-readable output remain unchanged
