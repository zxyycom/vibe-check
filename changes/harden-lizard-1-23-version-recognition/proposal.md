# Proposal

本 Plan 收紧 `functionMetrics` 的 Lizard availability：只有 canonical、无 leading zero 的 `1.23.x` version output 才允许进入 CSV scan。

## Why

当前 adapter 对 `<executable> --version` 的成功退出只排除空输出，因此任意非空文本都会被当作可用 provenance。这样 version probe 不能兑现已有的“兼容 Lizard 1.23 version output 与 CSV contract”边界，也可能让不受支持的 executable 进入 measurement。

这不是精确锁定 `1.23.0` 的 Product 政策，也不证明某个真实 patch release 不兼容。Product 应识别支持的 `1.23.x` 系列；需要精确 patch 的消费项目自行拥有 wrapper。

## Outcome

在有 approved exact input 时，`functionMetrics` 仅当 `--version` 的 trim 后完整输出为 canonical、无 leading zero 的 `1.23.<patch>` 才扫描。其它成功输出以既有 unavailable 语义结算，且不执行 `--csv`；已接受版本的 exact-path、CSV parsing、Records 和 final data 语义保持不变。

## Scope

### Intended Change

- 在 `function-metrics` 所有的 Lizard availability adapter 内识别 canonical 三段十进制 version（每段为 `0` 或不以 `0` 开头），并接受 `1.23.x`。
- 复用现有 `contract-error` 到 owning Check 的 unavailable mapping；不增加 public scanner options、Run Controls 或新的 outcome code。
- 同步 adapter/public Check 回归、semantic Case 和 Lizard 文档，使消费者、implementation 与验证使用同一 compatibility boundary。

### Resulting Impacts

- 曾依赖 noncanonical、缺少 patch 或非 `1.23.x` output 的自定义 executable 将成为 unavailable；这是有意的 fail-closed 收紧。
- 拒绝必须发生在 scan 前；aggregate 选择 `unavailable: "fail"` 时可据此阻止后续 consumer admission，但 admission graph 不属于 Product。
- 错误信息不能回显无法识别的原始 command output；未来 TypeScript backend port 完成时将整体删除这项外部-tool hardening。

## Success Criteria

1. canonical `1.23.0` 和 `1.23.1` 被接受；缺少 patch、带额外文本、leading-zero 版本（如 `1.23.00` 或 `01.23.0`）、其它系列、任意文本和空输出均在 scan 前拒绝。
2. 拒绝时 public `functionMetrics` 为 `unavailable`，配置 `unavailable: "fail"` 的 aggregate 为 `failed`，且 scan marker 不存在。
3. 已接受版本保持 exact-path CSV measurement；zero-function、malformed/partial CSV、process/signal failure 和 exact-input reconciliation 的既有结果不变。
4. 对应测试、Test Evidence closure、package candidate external-consumer acceptance 与 full Project Gate 均通过公开入口 `bun run package:verify` 闭合。

## Affected Owners

- `src/package-checks/function-metrics/lizard/availability.ts` 及相邻 Lizard/public Check tests：compatibility 判断与可观察 outcome。
- `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md`：消费者可依赖的 Lizard protocol 边界。
- `docs/testing/cases/check-owned-scanners.md`：Lizard adapter 的语义证明。
- `docs/decisions/let-function-metrics-adapter-own-lizard-cli-protocol.md`：version probe 仍为 adapter 私有协议。
- `changes/port-lizard-function-metrics-to-typescript/`：相邻的未来删除计划；本 Change 不修改或推进它。
