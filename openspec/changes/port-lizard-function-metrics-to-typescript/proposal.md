本 proposal 将当前 Python/Lizard function-metrics 实现逐文件翻译为 TypeScript，并在结果等价后从正式扫描路径删除 Python runtime。

## Why

当前 TS/Bun quality tooling 仍通过 python -m lizard --csv 获取函数指标，因此正式运行依赖 Python、Lizard package、外部进程和 CSV 协议。Lizard 的产品所需源码规模有限、模块关系清楚，适合按上游文件逐一翻译为仓库内 TypeScript。

## What Changes

- 固定 terryyin/lizard 1.23.0 作为翻译基线，记录上游文件、目标 TypeScript 文件和适用 license。
- 按文件翻译分析模型、token/state-machine 基础、共享 helper，以及 TypeScript、Go、Rust、Python reader。
- 同步翻译对应上游测试，并用现有 Python/Lizard 结果对照验证名称、位置、NLOC、CCN、token 和参数结果。
- 将 function-metrics adapter 改为直接调用 TypeScript 模块。
- 等价验证通过后，删除 Lizard command 配置、Python/Lizard availability check、进程 wrapper 和 CSV parser。
- 保持现有 FunctionMetric、diagnostic、warning、gate、human/JSON output 和四语言支持范围。

本 change 不翻译未被产品使用的其它语言、Lizard CLI、reporter、extension 或 duplicate detector，也不借移植修改 Lizard 的指标算法和已知限制。

## Capabilities

### New Capabilities

- `scanner-backends`：在 TypeScript port 完成后定义产品固定 scanner stack、adapter、component resolution 和 failure boundary。

### Modified Capabilities

- structural-scanning：保持现有四语言指标契约，替换 backend 实现。
- test-fixtures：增加逐文件翻译测试和 Python/Lizard 对照验证。

## Impact

- 前置 change `promote-typescript-quality-tooling-to-product` 先完成现有质量运行时的源码上移，本 change 再替换其 Python/Lizard 实现。
- 主要影响 quality-core 的 Lizard adapter、内部 TypeScript port、测试和工具配置。
- 对外 CLI、schema、rule ID 和报告结构不变；内部 scanner identity 随实现切换更新。
