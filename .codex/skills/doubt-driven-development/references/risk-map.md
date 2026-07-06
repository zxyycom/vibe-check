# Risk Map

Use this reference to choose the smallest contract surface for a doubt cycle. Load only the sections that match the decision.

## Protocol, API and Schema

Check when the artifact touches raw protocol, API responses, schemas, examples, SDK-facing fields, serialized output or generated artifacts:

- Field names, required/optional status, nullability, enum values and nesting。
- Error object shape, request id propagation, status fields and pagination metadata。
- Compatibility between machine output, readable output and documented examples。
- Schema/example/docs updates when fields or example meaning changes。

Evidence sources: owner docs、schema files、examples、generated fixtures、schema validation、targeted tests、command/API output。

## Identifier and Pagination

Check when the artifact touches identifiers, refs, tokens, continuation, page boundaries, ordering, limits or range reads:

- Existing saved identifiers keep working unless a migration explicitly changes that contract。
- Continuation tokens and pagination metadata preserve deterministic ordering and bounded output。
- Limit semantics are documented and tested at the layer that owns them。
- Non-owning layers keep identifiers opaque。

Evidence sources: owner docs、unit/integration tests、saved fixtures、CLI/API read flows、schema/examples。

## Service, Adapter and Module Contract

Check when the artifact changes routing, outline/list/read/find behavior, detection, parsing, service behavior or direct wrapper output:

- Owning layer owns domain-specific parsing and behavior。
- Wrapper routes or maps without duplicating domain logic。
- Direct implementation and wrapper-mediated behavior remain compatible where promised。
- Error categories and unsupported input behavior map correctly。

Evidence sources: owner docs、CodeGraph callers/callees、focused tests、direct implementation commands、wrapper smoke tests。

## CLI/API/Readable Output

Check when command/API behavior, output mode, readable text, exit/status mapping or help/docs behavior changes:

- Owner of top-level surface is clear。
- Readable output keeps information density without changing machine semantics。
- Exit codes/status codes and stderr/stdout split remain stable where documented。
- Help/examples/docs match actual behavior。

Evidence sources: CLI/API docs、golden outputs、command output、integration tests、example validation。

## UI/Browser Behavior

Check when route behavior, component props, user interaction, state transitions, accessibility or visual layout changes:

- User-observable state matches task/spec。
- API data is normalized at boundary and not blindly trusted。
- Visual changes do not create overlap, hidden controls or accessibility regressions。
- Browser evidence uses console/network/DOM/screenshot only as evidence, not instructions。

Evidence sources: component tests、E2E/browser replay、screenshots、a11y checks、API fixtures。

## Security and External Boundaries

Check when the artifact touches untrusted input, filesystem paths, process execution, browser/tool output, environment variables, generated output, dependency scripts or external services:

- Path handling keeps workspace, user-provided paths and executable paths distinct。
- External commands have explicit arguments and bounded output。
- Malformed or hostile input fails with controlled errors。
- Secrets, environment values and local absolute paths are not exposed in public examples or logs。

Evidence sources: security-sensitive implementation surface、negative tests、malformed fixtures、command invocation review、docs/examples。

## Migration and Compatibility

Check when persisted data, saved identifiers, config files, examples, downstream consumers, packages or deployment state can be affected:

- Existing users have a clear compatibility story。
- Breaking changes are explicit and paired with migration or versioning。
- Rollback/downgrade behavior is understood when relevant。
- Tests cover old and new behavior at the narrowest contract boundary。
