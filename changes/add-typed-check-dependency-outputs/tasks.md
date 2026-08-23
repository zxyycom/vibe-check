# Tasks

任务按 Decision/Test readiness、public provider contract、Core/Run read、four-state settlement、package evidence 和 final verification 的依赖顺序编排。全部 20 项现已完成；Change 仍为 active 仅因没有归档授权。Checkbox 只记录实际证据，不替代 stable owner、Decision alignment 或归档授权。

## Readiness

- [x] 0.1 核对形成时的 string graph、canonical final data、RunResult/machine 与 `unavailable` blocked baseline；形成时证据见 [`readiness-audit.md#formation-time-baseline`](readiness-audit.md#formation-time-baseline)。
- [x] 0.2 用isolated readiness prototype验证string getter、parser-return Data anchor、execution constraint、existing authoring inference、declaration emit与external consumption；证据见[`readiness-audit.md#typescript-prototype`](readiness-audit.md#typescript-prototype)。
- [x] 0.3 审计named consumers并把首版限定为primary final data；证据见[`readiness-audit.md#consumer-audit`](readiness-audit.md#consumer-audit)。
- [x] 0.4 已按 `decision-records` 把 typed dependency Decision 演进为 Design 定义的 final-data-first contract；形成时保持 `active + unaligned` 并通过 `bun run decisions -- check`，后续实现闭合后已成为 `active + aligned`。形成时证据见 [`readiness-audit.md#decision-state-at-formation`](readiness-audit.md#decision-state-at-formation)。
- [x] 0.5 已按`test-evidence-review`通过Case完整性检查，并定位provider typing、Definition、Core read、Run orchestration、package declaration与external readback owners；证据见[`readiness-audit.md#test-evidence-audit`](readiness-audit.md#test-evidence-audit)。

## Implementation

- [x] 1.1 实现 Design 的 typed provider declaration：parser-return Data anchor、execution constraint、required parser preservation 及 existing options/ordinary/recursive composition compatibility。
- [x] 1.2 扩展 Definition grammar：只接受 executable provider function `parseData`，并证明它不进入 snapshot/fingerprint。
- [x] 1.3 实现 Core settled read seam 与 Run callback-local string getter：effective direct authorization、same canonical data 和 two-error result。
- [x] 1.4 删除 ordinary `unavailable` Task-failure adaptation 并迁移 four-state admission，同时保留 cancellation、invalid graph 与 trusted-failure boundaries。
- [x] 1.5 补type/runtime matrices，覆盖Design Acceptance Evidence列出的provider、authorization、status、identity、freeze与lifecycle cases。
- [x] 1.6 在 candidate/installed consumer 加入 versioned changed-files one-producer/two-consumer proof，并从 RunResult 或 machine data 复用同一 parser。
- [x] 1.7 同步 public inventory 与 stable owner docs；JSDoc 准确说明 canonical runtime object、parser responsibility 与 non-normative type-anchor heuristic。
- [x] 1.8 按 `test-evidence-review` 更新 Case Owner/Proves，删除 implicit `prerequisite-unavailable` 旧证明并登记新 runtime/package evidence。

## Verification

- [x] 2.1 运行focused Definition/type tests，证明Data anchor、readable mismatch diagnostic、required parser declaration和existing authoring compatibility。
- [x] 2.2 运行focused Core/Run/task tests，证明same canonical fact、effective direct-only authorization、two errors、four-state admission和failure boundaries。
- [x] 2.3 运行package candidate、declaration emit、public inventory与ancestry-external installed consumer，证明无consumer cast、manual generic、新runtime root或ancestry leak。
- [x] 2.4 运行machine/output focused tests，证明version-matched parser可读取existing v4 final data且schema/fingerprint不变。
- [x] 2.5 运行Case、Decision、Change Plan、links、schema、examples与docs validation。
- [x] 2.6 运行`bun run verify:vibe-check-workspace:required`和`bun run verify:vibe-check-workspace:full`。
- [x] 2.7 按 Proposal Success Criteria 完成 10/10 语义验收，stable owners 与 Decision 已经对齐；本次没有归档授权，因此 Change 保持 active。

## Completion Evidence

- Product focused/full tests、product/scripts typecheck与lint、package candidate external consumer、declaration positive/negative matrix、146/146 Test Evidence和完整docs/schema/examples validation均通过。
- Required与full Project Gate均无disabled tag通过；public-type与runtime独立审查最终均为无blocking finding。
- Decision `read-direct-dependency-final-data-by-string`已标记`active + aligned`；归档仍需单独授权。
