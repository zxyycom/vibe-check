# Tasks

checkbox 只记录 task-level evidence，不接受 Success Criteria、不能代替 Decision alignment，也不授予 archive 或 commit。

## Readiness

- [x] 0.1 在 Implementation 前恢复 Plan、直接相关 Decision、stable owner docs 与相邻 tests；核对本 Plan 不与 progress-duration 或其它 active Change 重叠，并记录 implementation baseline 与安全字段变化。
- [x] 0.2 完成 diagnostics provenance matrix：四个 docs tasks、Decision Records、semantic Test Evidence 与 ast-grep version mismatch 分别列出 source、stable local ID、Record data、safe presentation、deterministic sort 和 unsafe fallback；明确 `package-api-documentation`、quality Finding 与 generic process `command-failure` 不在范围内。新增或修改 test body/Case entity 前后运行 `bun run test-evidence -- check --root .`。
- [x] 0.3 确认长期 Decision 的完整方向仍适用；只有所有 owner facts、tests 和 verification 成为当前事实后才进行 alignment review。Plan 或 checkbox 不构成 alignment。

## Implementation

- [x] 1.1 在 `scripts/project/gate/checks/process/native-operation.ts` 实现 private safe diagnostic item/failure contract：non-empty owner-sorted diagnostics 逐项成为 Records，保留 Check-level result fact，提供 first-ten/240-code-point bounded preview、explicit truncation/omitted message，以及 empty/duplicate/unsafe/throw/cancelled fail-closed branch。不得创建 native process log，也不得从 Record data 或 exception 生成 preview。
- [x] 1.2 为 `scripts/validation/documentation/**` 建立 typed expected-validation diagnostic/result boundary，并更新 root validation CLI/workflow reporting；保持 in-process no-reporter silence 与 unexpected fault distinction。为 `json`、`schema`、`examples` 和 `links` 分别提供 safe stable IDs/data/presentation；links 一次收集每个 missing local-link occurrence，Record data 包含 repo-relative source/target、line/column 和 occurrence。
- [x] 1.3 让四个 `createDocsValidationCheck` instances 消费 docs typed diagnostics，而非 catch-all `{ code, count }`；保留 focused command、docs mutex/selection 与 Check status semantics。新增 fixture 覆盖 multiple broken links、每个 docs task 的 expected failure、direct CLI default detailed output 与 Gate 无 direct console output。
- [x] 1.4 将 Decision Records adapter 从 aggregate error count 改为每个 approved validation error 一个 Record；将 semantic Test Evidence adapter 从 count/first code 改为每个 blocking safe diagnostic 一个 Record，并实现 owner-defined sort、identity/data/presentation 和 process/parser-derived text 的 redaction-or-unavailable boundary。不得改变 Decision lifecycle、Test Evidence coverage calculation 或 exit-code semantics。
- [x] 1.5 在 `test-evidence-rule-tests` 的 version mismatch branch 增加 safe Check-local Record（expected/mismatch classification 和 invocation-relative transcript reference）；保留 nonzero command 使用 current `command-failure` path，禁止 parse/copy version or rule-test stdout/stderr。同步 native-vs-process regression fixtures。
- [x] 1.6 更新 stable owner documentation 和 affected Test Evidence Case Proves/Entities，使 native diagnostics、default bounded preview、Record safety 和 process transcript boundary 可恢复；不为没有独立 proof purpose 的 assertion 机械新增 Case。

## Verification

- [x] 2.1 运行最窄 docs workflow/link/provider tests、Gate native operation/definition tests、Decision adapter tests、Test Evidence adapter tests 和 ast-grep rule-test Check tests；对 multi-link fixture 断言每条 Record 的 `{ sourcePath,targetPath,location,occurrence }`、stable identity/order、ten-item overflow 及 long-item truncation。
- [x] 2.2 运行一次 fixture-backed Product/Gate output 验证，检查 `RunResult.snapshot.records` 和 machine `records.ndjson` 含完整 diagnostic set、progress terminal/tee 有界 preview、failed status/final data/effective aggregate 不变，native Checks 无 `process.log`，command nonzero 与 ast-grep raw stdout/stderr 仍只在 private transcript。
- [x] 2.3 运行 `bun run validate -- docs`、`bun run test-evidence -- check --root .`、`bun run decisions -- check` 和 `bun run change-plan -- check changes/publish-detailed-native-gate-diagnostic-records`；确认 Case mappings、docs typed output 和 Decision index/lifecycle 闭合。
- [x] 2.4 运行 `bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run format -- check` 以及 `bun run check`；若 Change 跨越的 package/material boundary require additional full gate, run documented target and report unrun boundaries。
- [x] 2.5 在所有 success criteria、owner docs、Case evidence 和 full verification 实际闭合后，复核 Decision alignment；在用户已有的 archive/commit 授权仍有效且确认其它工作区改动未混入后，运行 Change archive，再只提交本 Change 可归因文件。此任务不授权提前 archive 或 commit。
