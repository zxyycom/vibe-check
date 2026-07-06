# Contract Review Cues

## 适用范围

审查 CLI/API、adapter/service、identifier、pagination/continuation、machine/readable output、schema/example、docs 或其他 public contract 相关 diff 时读取本 reference。普通代码审查先使用 `../SKILL.md`。

## Contract Cues

- 保持 owning layer 清楚：生成和解析 identifier/token/ref 的层拥有语义，外层只原样传递并做边界检查。
- Separate machine output from readable output. They can share business semantics, but not transport wrappers, schema, pagination envelope or stability promises。
- Check pagination and continuation: bounded reads, stable metadata, enforced limits, deterministic ordering, and no accidental full-data load。
- Keep adapter/service responsibilities inside owning layer: detection, parsing, routing, lookup, serialization and direct behavior。
- Check platform path behavior when CLI/process boundaries move: drive letters, backslashes, spaces, quoting, stdin/stdout/stderr and readable error output。
- When protocol, schema, examples, CLI/API output or service behavior changes, verify governing docs and validation artifacts are updated。
- For browser/UI public behavior, verify user-observable state, accessibility-relevant output, routing and API mapping rather than component internals。
- For migrations or release behavior, verify compatibility, rollback/downgrade story and generated artifacts。

## Verification Evidence Cues

- Parser/domain behavior: unit or integration tests with focused fixtures。
- CLI/API/routing/config/output mode: CLI/API integration or smoke tests。
- Schema/example changes: schema validation, fixture/example round trip, generated output diff。
- UI changes: component/E2E/manual browser evidence; screenshots only for visual differences。
- Bug fixes that change stable observable semantics: evidence that corrected behavior is observable and tied to the owning surface; when feasible, show it would fail or be unsupported before the fix and pass after it。
- Review wording: describe gaps as current verification evidence gaps and label them with the owner surface and current behavior。

## Verification Scope

Use repository-declared commands and current docs rather than hardcoded build output paths。

- Markdown-only skill/reference changes: run available Markdown shape/link checks, then diff/whitespace checks。
- CLI/API or service behavior: run relevant smoke/integration checks。
- Protocol, schema, examples, docs or cross-boundary work: run the repository workspace verifier when feasible, or record the narrow checks and skipped wider verification。
- Browser/UI behavior: run available component/E2E/browser verification scoped to the changed route or interaction。
