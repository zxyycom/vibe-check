# Proposal

本 Change 在不改变 Function Metrics measurement 可观察行为的前提下，消除两项既有质量记录。

## Why

`decodeUtf8IgnoringInvalidBytes` 与 `isFunctionMetric` 超过 repository Function Metrics quality threshold；两项记录分别遮蔽 UTF-8 fallback 的序列处理阶段和 Worker reply 的 fail-closed shape 条件。

## Outcome

Function Metrics measurement 的 UTF-8 fallback 和 Worker response predicate 以可独立审查的领域步骤表达；现有成功、fail-closed、staged-validation、extra-key 和 numeric-domain 行为保持不变，两项既有 quality finding 消失。

## Scope

### Intended Change

仅重组 `src/package-checks/function-metrics/measurement.ts` 中的 UTF-8 fallback decoder 和 Worker reply metric predicate；扩展这两个边界的直接测试，并同步已有 semantic Case 与本 Change artifacts。

### Resulting Impacts

- UTF-8 fallback 继续以完整原始 byte sequence 保持 Python `errors="ignore"` 语义；non-fatal `TextDecoder` 不得改写 strict-success 的 BOM/newline 行为。
- Worker reply guard 保持既有字段责任、fail-closed、extra-key 和 safe-integer domain；后续 analysis 负责的 nesting/contributor validation 不得移入 transport boundary。
- 测试正文和 Case `Proves` 的变化保持 Test Evidence entity closure；定向 product quality scan 不再报告两项目标 finding。

## Success Criteria

- 定向 repository Function Metrics scan 不再报告 `decodeUtf8IgnoringInvalidBytes` 或 `isFunctionMetric`，且不引入新增 finding。
- 原有和新增的 byte-level fallback、Worker reply boundary tests 通过，覆盖 valid/invalid UTF-8 sequence、strict retry effects、numeric-domain、extra-key 和 staged-validation 边界。
- Change Plan、Test Evidence closure、product typecheck、product lint 和 format check 通过；完整 Gate 和 `--all` 不在本 Change 的验证范围内。

## Affected Owners

- `docs/checks/function-metrics.md`：Function Metrics Check 的 source-byte、complete-analysis 与 unavailable 契约。
- `docs/scanner-dependencies.md#owner-local-adapters`：measurement → Worker → adapter 的私有 owner-local boundary。
- `docs/testing.md` 与 `docs/testing/case-maintenance.md`：直接 test 与 Case 账本维护、验证入口。
