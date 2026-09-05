# Tasks

任务按 owner 确认、最小实现、语义测试与定向质量验收顺序完成。

## Readiness

- [x] 0.1 读取 Function Metrics、scanner-adapter、testing 与 Case owners，并确认起点 Test Evidence closure、现有测试实体和两项目标 finding 的范围。
- [x] 0.2 审阅 UTF-8 fallback 与 Worker reply 的当前 staged-validation 边界，确定不改变 strict-success、Python ignore retry、extra key 或 numeric-domain 行为。

## Implementation

- [x] 1.1 将 UTF-8 fallback 按 ASCII、two-byte、three-byte 与 four-byte sequence 的独立解码职责重组，保留逐一忽略无效 leading byte 的行为。
- [x] 1.2 将 Worker FunctionMetric reply predicate 按 identity、safe-integer measurements 与 analyzer CCN shape 的实质子条件重组，保留后续 analysis 的 nesting/contributor validation。
- [x] 1.3 扩展 source-byte 与 mocked Worker-reply tests，并同步 check-owned-scanners Case 的现有证明语义。

## Verification

- [x] 2.1 运行目标 Function Metrics tests 与完整 Test Evidence closure，确认 byte fallback 和 reply boundary 的可观察行为连续。
- [x] 2.2 运行 product typecheck、product lint、format check、Change Plan check 和定向 repository quality scan，确认两项记录消失且没有新增 finding。
- [x] 2.3 审阅局部 diff、任务/成功标准和未运行的完整 Gate/`--all` 边界；不归档、不提交。
