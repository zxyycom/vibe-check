# 调度测量精度与 availability

本文拥有 Scheduler measurement 的数值目标、证明域和生产检查点；collector 职责与终态交付见 [调度观察与终态交付](scheduler-observation.md#measurement-collector-与-immutable-context)。

## 当前实现与数值目标

当前实现的 `measurement/exact-time.ts` 以 BigInt 保存 Run-local 二进制时间单位。首次有效 sample 为 positive normal 时，
由 DataView 的 binary64 exponent bits 取其 binade exponent E，固定单位为 `2^(E-52)`；首 sample 非正或 subnormal 时使用 `2^-1074`。
当前实现只从既有首个 clock call 选择单位，随后保持不变；不能用有舍入的 `Math.log2` 推断。
clock guard 保证后续有效 sample 不小于首值，因此所有 sample 都可在该单位精确表示，不发生采样量化。
该表示不是新公开时间分辨率；独立 Run 不共享单位。

必须以有限 binary64 sample 的精确实值为目标，对其做差、乘非负整数 count/capacity、累计与 prefix subtraction；当前实现采用精确整数运算。
每个被交付结果完成本地运算后一次 round-to-nearest/ties-to-even 转回 Number；巨大共享 prefix 不吞掉微小局部区间，
private prefix 即使超出 Number range，也不决定真实有限差值的 availability。summary 的精确合计、跨度与商同样在最终结果处一次舍入，
而非把已舍入的 DTO 再相加或相除；投影含义由[人读输出](human-output.md#scheduler-summary-projections)拥有。

采用门禁以每个结果自己的贡献区间为准：令 `S = Σ wᵢ(bᵢ-aᵢ)`，n 为该结果的非零贡献数，
与直接非负逐项 Number 累加 `fl(Σ fl(wᵢ fl(bᵢ-aᵢ)))` 比较。
在有限且无中间 overflow、`(n+2)u < 1`（`u = 2^-53`）时，直接基准前向误差不超过 `γ_(n+2) S`，
其中 `γ_k = ku/(1-ku)`；精确累计后一次舍入的 normal 结果误差不超过 `uS`，subnormal 积分/等待结果精确。
空结果精确为零。由于整数权重与 sample 均为 `2^-1074` 的整数倍，这些运算的 subnormal 精确结果不会另有下溢损失。
超出该相对误差域时，仍以精确目标的正确舍入和可表示性判定，不放宽经验容差，也不按全 Run 的巨大累计量放宽局部 delay 误差。

utilization 必须以精确分子/分母形成的有理商为目标并正确舍入；当前实现使用整数 div/rem 与 ties-even 舍入。normal 商误差不超过 `uR`，
subnormal 商的绝对误差不超过 `2^-1075`。零分母或数学比值不在 `[0,1]` 内仍投影为 null。
若直接累计分子/分母的相对误差界分别为 `γ_a`、`γ_b`，且 `γ_b < 1`，再做一次 normal Number 除法的保守相对界为
`(1+γ_a)(1+u)/(1-γ_b)-1`；subnormal 商还须计入绝对半个最小单位的舍入项。
精确商的一次舍入不劣于该基准；零分子精确为零，不能假设比值也是时间单位的整数倍。

## Availability 与验证

availability 在实际请求的生产检查点确定：state/online checkpoint 验证所需 aggregate，action observation append 前验证该局部 interval，
terminal seal 前验证逐 Task 及实际启用 summary 的全部派生结果（含 control/wait/span）。available 的时长、等待与积分均为 finite、non-negative；
无法有效表示使用既有 `integral-invalid`，clock throw/non-finite/backward 与非法 interval 保留各自首次已确定原因。
全部 terminal 数值先统一验证，再交付任一字段或 effect；getter 只读已固定事实，后续 fault 不回写旧 reader。

独立数值 oracle 不复用 Product 的 DataView decode/rounding，而以二进制有理数及相邻 Number 距离/tie parity 验证精度、极值、局部消减和读取顺序。
