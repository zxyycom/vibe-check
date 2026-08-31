# Design

本设计在现有 Lizard adapter 内建立一个明确的 `1.23.x` version barrier；它保护当前外部 backend，不扩大 public API，也不取代未来的 TypeScript port。

## Context

Plan 形成时，`src/package-checks/function-metrics/lizard/availability.ts` 已拥有 `<executable> --version` probe：它拒绝 command/process/signal/nonzero failure 与空 output，却接受任何其它 output。`measureFunctionMetrics` 已先调用 availability，只有可用时才调用 `<approved exact paths> --csv`。

Plan 形成时，`docs/checks/function-metrics.md` 将消费者契约定义为兼容 Lizard 1.23 version output 与 CSV contract；本仓库 `mise exec -- lizard --version` 的实际输出为 `1.23.0`。`docs/decisions/let-function-metrics-adapter-own-lizard-cli-protocol.md` 规定 version probe、exact paths、CSV 与 failure mapping 都由 adapter 拥有。

相邻 `port-lizard-function-metrics-to-typescript` Plan 是独立、后置的 backend hard cut；它没有授权本 Change 预先修改其范围或恢复实施。

## Goals / Non-Goals

**Goals**

- 只允许可判定为兼容的 canonical、无 leading zero 的 `1.23.x` provenance 进入 CSV scan。
- 对 unsupported 或 unrecognized output 在 scan 前 fail closed，并保留现有 unavailable reason grammar。
- 支持 `1.23` patch 更新，同时将精确 patch pin 留在消费项目政策层。

**Non-Goals**

- 不根据自报 version 认证 executable 的身份、来源或测量正确性。
- 不承诺所有未来 `1.23.x` patch 的指标语义；CSV 与 exact-input validation 继续承担其余协议验证。
- 不支持 `1.22.x`、`2.x`、pre-release、带前后缀、leading zero 或缺少 patch 的 output。
- 不新增 scanner 参数、改变 Records/final data，或推进长期 TypeScript backend port。

## Decisions

### Intended Change

1. **Canonical parser。** 对 `commandOutput(result)` 产生的 trim 后完整字符串进行全匹配；仅接受三段 ASCII 十进制 `major.minor.patch`，每段的 grammar 都是 `0` 或不以 `0` 开头的十进制整数。因此 `1.23.00`、`01.23.0` 和 `1.023.0` 不匹配。每段解析后必须为非负安全整数。不得从任意文本中提取 version token。
2. **Compatibility rule。** 仅 `major === 1 && minor === 23` 通过，patch 可为任意非负安全整数。因此 `1.23.0` 与 `1.23.1` 都通过；Product 不提供 exact-patch option。
3. **Failure mapping and safe diagnostics。** parser 不匹配或系列不支持时返回既有 `{ available: false, reason: "contract-error" }`。无法识别的 raw output 不得回显；已解析但不支持时，诊断最多使用由解析数字重新序列化的 canonical version。现有 process failure 的 diagnostic 行为保持不变。
4. **Barrier order。** 保持 `measureFunctionMetrics` 的 availability-before-scan 顺序。availability 为 false 时不得构造或执行 scan command。
5. **Documentation and evidence。** `function-metrics` guide 完整拥有消费者可依赖的 accepted-output rule 与 exact-wrapper boundary；scanner-dependencies 只说明 private adapter ownership；semantic Case 只说明可观察的 availability/scan/CSV boundary。

```text
approved executable
  -> --version
  -> canonical 1.23.x?
     -> no: unavailable / no --csv execution
     -> yes: approved exact paths + --csv
  -> existing CSV and exact-input validation
  -> existing Records and Check outcome
```

### Resulting Impacts

- 现有 fake fixtures 中的 `lizard 1.23` 不再是有效 success provenance；它们必须改成 canonical output，避免测试继续掩盖实际 compatibility rule。
- Custom wrapper 必须将其 `--version` 行为规范化为无 leading zero 的 `1.23.<patch>`；需要 exact `1.23.0` 的 wrapper 在自己的 `--version` path 拒绝其它 patch，扫描调用仍原样交给 Lizard。
- 版本拒绝使 owning Check unavailable；aggregate 如何使用该 fact 由调用方已有 policy 决定，不在本 Change 添加 package/admission behavior。
- 长期 backend port 成功时应删除整个 Lizard adapter 及其 recognition；不保留 fallback 或跨 Change shared registry。

## Risks / Trade-offs

- 接受 `1.23.x` 是 compatibility range，而非真实性或完整行为证明；现有 process、CSV 和 exact-scope validation 仍必须保留并回归。
- 收紧会拒绝过去偶然工作的 wrapper，但接受任意 nonempty text 会使 version probe 没有可验证价值。
- canonical-only output 是有意的 wrapper contract；若将来真实 Lizard 改变 `--version` 格式或确认某 patch 不兼容，必须建立新 Change 重新调查和调整该 rule。

## Open Questions

无。accepted series、canonical form、failure mapping、exact-version policy owner 和长期删除边界均已确定。
