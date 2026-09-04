# Design

本 Change 将 generic Record presentation 放入唯一拥有 terminal writer 的 Product progress renderer，并保持事实与显示分离。

## Context

`src/check-settlement/session.ts` owns accepted Record facts; `src/project-run/check-execution/**` closes Check lifecycle facts and privately hands settled facts to Product output; `src/project-run/progress-rendering/**` alone owns terminal rendering and tee failure containment. Native Gate's `native-operation.ts` currently produces both Records and diagnostic preview messages. `docs/api-mechanics.md` owns the exact managed-progress contract, while `docs/architecture.md` and `docs/configuration.md` define the settled lifecycle and output selection boundary. The archived native diagnostic Decision continues to govern owner-safe projections; this revision replaces only its adapter-local preview direction.

## Goals / Non-Goals

Goals: render accepted Records for every Check by a single Product-owned path; keep Record and message quotas independent at five; truncate only terminal output by Unicode code points; preserve all Core/RunResult/machine facts; remove duplicated native diagnostic preview; prove attention visibility and writer containment.

Non-Goals: change Record schemas, Check callback APIs, machine v4, RunResult shape, producer-specific finding presentations, external process transcripts, or add configurable limits/formatter registries.

## Decisions

### Intended Change

Add a Product-private post-settlement Record handoff from the Core session through execution lifecycle feedback. Extend `ProgressFeedback` with complete accepted `CoreRecord[]`. Only the enabled renderer renders Records and messages as two separately bounded lists after the settled row. A Record presentation is its local id plus `canonicalJsonText(data)`, escaped and capped only at terminal formatting; Core facts remain unchanged. Refactor native operation failure output to report its safe Records and a focused command message without per-diagnostic messages. Evolve the native diagnostic decision through a revision record.

### Resulting Impacts

- The Core session needs a narrow readback method for a settled Check's accepted records; this is Product-private and preserves the frozen snapshot contract. Direct execution lifecycle facts carry those records after settlement. Tests must prove record ownership/order and facts remain unchanged.
- Progress's visibility predicate must include Records, and each list needs separate count and per-line truncation behavior. Existing message behavior becomes bounded in terminal only; `RunResult.checkMessages` remains exact. Tests and semantic Case prose must cover this.
- Gate native tests must stop expecting ten/240 diagnostic messages and instead assert Product's five-record preview, distinct focused command message, and full machine/snapshot records. Package quality messages remain Check-owned; this Change will only document their possible coexistence with generic Record preview, not suppress them without producer-specific review.
- Generic Record preview means process failure Record data cannot retain a raw executable path: the Record uses only its basename command label, while the full command and arguments remain in its private transcript. Stable behavior docs and the predecessor Decision must state Product-owned presentation and its non-fact boundary. No README/example/schema changes are needed because public API and machine DTO bytes are unchanged.

## Risks / Trade-offs

Rendering canonical JSON can be verbose, so the per-record text cap bounds terminal and tee size; it intentionally does not optimize for producer-specific readability. Progress writer failure must remain contained after Record handoff. Settling a Check before lifecycle presentation is required so only accepted Records appear; no streaming preview is introduced.

## Open Questions

无：用户已确认 Record/message 分别最多五条、两类均做长度截断，且 preview 必须由 Product progress owner 实现。
