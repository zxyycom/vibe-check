# Proposal

本 Draft 规划 `markdownLint` 的精确 Finding waiver：调用方能接受已确认的局部例外，同时保留完整 lint 证据。

## Why

当前 `markdownLint` 只有 `files` selection、规则集和全局 `findingPolicy`；没有原生 `findingWaivers`，inline config 也固定禁用。调用方若只接受少数已知 Finding，只能维持整个 Check 的 non-blocking、改变扫描范围或关闭规则，都会影响无关的新 Finding。

Check-owned waiver 可在完整 lint 后逐项对账，使新 Finding 继续接受原有 policy 判断；Project Gate 是否配置 waiver 是另一个采用决定。

## Outcome

`markdownLint` 调用方可以声明带理由的精确 Finding waiver。完整 lint 后，唯一匹配的 Finding 仍发布并带豁免证据；未命中或过宽配置产生可见 audit、相关 Finding 继续 actionable。省略 waiver 时，现有选择、规则、Finding、计数与 Check 结算保持不变。
