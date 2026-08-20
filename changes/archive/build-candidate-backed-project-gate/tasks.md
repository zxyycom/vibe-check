# Tasks

本清单只记录本 Change 的进度。稳定行为见 `docs/script-tooling.md`；cutover 输入证据见
`gate-readiness-handoff.md`。

## Readiness

- [x] 0.1 已核对相关 owner、Change 与 Decision。
- [x] 0.2 已审计 legacy verifier 与候选 Gate 的独立边界，以及 20 项 catalog 的 profile 覆盖。
- [x] 0.3 已确认 adapter controls、N/A、failure Record、policy、日志、exit、capacity 与正式调用边界；无需新增长期 Decision。
- [x] 0.4 已在 Plan 基线运行 required workspace gate，并核对候选输入与 owner 未漂移。

## Implementation

- [x] 1.1 已建立候选 Gate 的独立 catalog、controls 与 eligibility helpers。
- [x] 1.2 已建立 candidate-first adapter 及 preparation/import/identity guard。
- [x] 1.3 已建立 descriptor-backed process Check、Definition 与 bound Run。
- [x] 1.4 已实现 per-Check transcript、outcome/Record 映射与 adapter closure。
- [x] 1.5 已补充 focused tests，并维护 Case ledger。
- [x] 1.6 已同步稳定行为 owner、下游导航与 handoff。

## Verification

- [x] 2.1 已运行 Gate focused tests、相邻 candidate/consumer/quality tests 与 strict Test Evidence。
- [x] 2.2 已运行 scripts typecheck、lint、format，并完成局部边界审计。
- [x] 2.3 已记录 candidate identity，并完成 exact-tarball 与 resolved-entry acceptance。
- [x] 2.4 已完成同 revision、无 disabled tag 的 legacy/candidate required/full 对照，以及仅用于 N/A 语义的 tag-partial run。
- [x] 2.5 已运行 `quality` 与 required/full workspace gates；legacy verifier 未被切换或删除。
- [x] 2.6 已写 readiness handoff，并完成 Change、docs、Decision 与 required workspace 验证。
