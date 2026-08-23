# Tasks

按Decision/Test readiness、public provider contract、Core/Run read、four-state settlement、package evidence和final verification的依赖顺序执行。Checkbox只记录实际证据，不替代stable owner、Decision alignment或归档授权。

## Readiness

- [x] 0.1 核对current string graph、canonical final data、RunResult/machine与`unavailable` blocked baseline；证据见[`readiness-audit.md#current-baseline`](readiness-audit.md#current-baseline)。
- [x] 0.2 用isolated readiness prototype验证string getter、parser-return Data anchor、execution constraint、existing authoring inference、declaration emit与external consumption；证据见[`readiness-audit.md#typescript-prototype`](readiness-audit.md#typescript-prototype)。
- [x] 0.3 审计named consumers并把首版限定为primary final data；证据见[`readiness-audit.md#consumer-audit`](readiness-audit.md#consumer-audit)。
- [x] 0.4 已按`decision-records`把typed dependency Decision演进为Design定义的final-data-first contract，保持`active + unaligned`并通过`bun run decisions -- check`；证据见[`readiness-audit.md#decision-state`](readiness-audit.md#decision-state)。
- [x] 0.5 已按`test-evidence-review`通过Case完整性检查，并定位provider typing、Definition、Core read、Run orchestration、package declaration与external readback owners；证据见[`readiness-audit.md#test-evidence-audit`](readiness-audit.md#test-evidence-audit)。

## Implementation

- [x] 1.1 实现Design的typed provider declaration：parser-return Data anchor、execution constraint、required parser preservation及existing options/ordinary/recursive composition compatibility。
- [x] 1.2 扩展Definition grammar：只接受executable provider function`parseData`，并证明它不进入snapshot/fingerprint。
- [x] 1.3 实现Core settled read seam与Run callback-local string getter：effective direct authorization、same canonical data和two-error result。
- [x] 1.4 删除ordinary`unavailable` Task-failure adaptation并迁移four-state admission，同时保留cancellation、invalid graph与trusted-failure boundaries。
- [x] 1.5 补type/runtime matrices，覆盖Design Acceptance Evidence列出的provider、authorization、status、identity、freeze与lifecycle cases。
- [x] 1.6 在candidate/installed consumer加入versioned changed-files one-producer/two-consumer proof，并从RunResult或machine data复用同一parser。
- [x] 1.7 同步public inventory与stable owner docs；JSDoc准确说明canonical runtime object、parser responsibility与non-normative type-anchor heuristic。
- [x] 1.8 按`test-evidence-review`更新Case Owner/Proves，删除implicit`prerequisite-unavailable`旧证明并登记新runtime/package evidence。

## Verification

- [x] 2.1 运行focused Definition/type tests，证明Data anchor、readable mismatch diagnostic、required parser declaration和existing authoring compatibility。
- [x] 2.2 运行focused Core/Run/task tests，证明same canonical fact、effective direct-only authorization、two errors、four-state admission和failure boundaries。
- [x] 2.3 运行package candidate、declaration emit、public inventory与ancestry-external installed consumer，证明无consumer cast、manual generic、新runtime root或ancestry leak。
- [x] 2.4 运行machine/output focused tests，证明version-matched parser可读取existing v4 final data且schema/fingerprint不变。
- [x] 2.5 运行Case、Decision、Change Plan、links、schema、examples与docs validation。
- [x] 2.6 运行`bun run verify:vibe-check-workspace:required`和`bun run verify:vibe-check-workspace:full`。
- [x] 2.7 按Proposal Success Criteria完成10/10语义验收，stable owners与Decision已经对齐；本次没有归档授权，因此Change保持active。

## Completion Evidence

- Product focused/full tests、product/scripts typecheck与lint、package candidate external consumer、declaration positive/negative matrix、146/146 Test Evidence和完整docs/schema/examples validation均通过。
- Required与full Project Gate均无disabled tag通过；public-type与runtime独立审查最终均为无blocking finding。
- Decision `read-direct-dependency-final-data-by-string`已标记`active + aligned`；归档仍需单独授权。
