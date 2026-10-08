# Proposal

本 Draft 规划将内置函数分析器的固定源码基线从 Lizard `1.24.0` 更新到 `1.24.1`。

## Why

[升级调查](../../docs/investigations/assess-lizard-1-24-1-upgrade.md)确认新版在独立样例中改善了 regex、模板、泛型及若干语言的函数识别或计量。统一固定基线可取得这些收益，减少多项 reader 补丁作为本地偏差长期维护的成本。

实施对象是随包 TypeScript 移植及其来源、行为证据，责任归私有分析器 owner。

## Outcome

内置分析器采用经身份核对的 `1.24.1` 固定源码基线；reader 改善通过移植、公开结果和安装后消费者验收，来源映射、法律材料及维护基线一致。

保持四项指标、27-reader/55-suffix 支持面和两个已启用扩展。Rust 贡献解释、Kotlin 位置及 regex 生命周期的采用风险在本 Change 内收敛。

本 Change 以升级为独立交付；两项既有 TypeScript 缺陷由独立修复 Change 承接。默认实施顺序见[Change 协调](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)。
