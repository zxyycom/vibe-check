# Tasks

按先证明边界、再拆分实现、最后区分范围内验证与未覆盖验证的顺序完成本 Change。

## Readiness
- [x] 0.1 Read the Markdown Link cache owner, decision, coding style, direct tests, Case ledger, and focused quality baseline.
- [x] 0.2 Record the two target baseline Records: file code-lines 320/300 and session `parse` cyclomatic-complexity 14/10.

## Implementation
- [x] 1.1 Extract a real Link-private envelope/payload codec that preserves closed immutable parse-facts persistence semantics.
- [x] 1.2 Reduce the session lifecycle `parse` control surface while retaining read-once, exact-byte identity, dirty dedupe, cancellation and publication semantics.
- [x] 1.3 Update direct cache evidence without changing its semantic test entity identity.

## Verification
- [x] 2.1 Run the narrow parse-facts cache tests and Case ledger check.
- [x] 2.2 Run product typecheck, product lint, and workspace format check.
- [x] 2.3 Inspect the local diff, check the active Change, and compare focused quality Records against the recorded baseline.
- [x] 2.4 Verify the Change artifacts remain mechanically valid after the final documentation audit; default Gate passes, while package and release verification remain outside this Change evidence.
