# Proposal

本 Change 以独立升级计划将随包函数分析器的固定源码基线从 Lizard `1.24.0` 更新到 `1.24.1`。

## Why

[升级调查](../../docs/investigations/assess-lizard-1-24-1-upgrade.md)确认 regex、模板、泛型及多个 reader 的函数识别/计量改善。统一固定基线比长期挑选 reader 补丁更容易维护来源；它不修复两项既有 TypeScript 缺陷，后者由[独立修复 Change](../fix-typescript-function-metrics/proposal.md)承接。

## Outcome

产品内置 TypeScript analyzer 采用 `1.24.1` / `0488a260e74e73ceba3149d7c600faac6a3616e6` 固定来源；七模块更新、必要 Rust 贡献解释/Kotlin 位置偏差及完整产品/安装后证据共同闭合。四项指标、默认 limits、27-reader/55-suffix 支持面及 `complextags`/`nd` 保持。

## Scope

### Intended Change

- 在私有 analyzer 翻译共享 regex、TypeScript、TSX、Python、Kotlin、PHP states、Rust 七模块的固定新版差异；不包括 Cognitive Complexity、CLI 或新扩展。
- 保持新版 Rust CCN，在真实增量的 `=>` 处采集 token/line；Kotlin expression body 以最后正文 token 完成位置/NLOC。两项偏差只闭合既有公开承诺，不重定义复杂度。
- 同步固定来源 inventory、headers/ranges/hashes、identity、oracle/deviation、版本化 fixture、法律/包 pin 及显式 advisory 基线。路线见 [Design](design.md)及[准备度核对](../../docs/investigations/prepare-function-metrics-change-plans.md)。

### Resulting Impacts

- 函数名/位置、NLOC/CCN/contributors 变化会影响 Finding、blocking 及 waiver，须用公开 Worker/Check 验收并交接 owner/变更日志。
- 版本化来源和 fixture 的实际消费者须迁到同一新版身份，包内 Worker、法律材料、来源 pin 与离线消费者一致。
- 行为测试、Case、旧基线绑定的工具/fixture 同步；性能按升级前后同输入比较，不将 fixed `1.24.0` Python 工具误当新版 parity。

## Success Criteria

1. 七模块固定来源、translated identity/法律闭合；当前入口不留下旧 fixture/provenance 引用，历史调查引用保真。
2. 14 项升级样例、27-reader oracle、malformed、shared regex、selected extension lifecycle 通过；原始新版 Rust/Kotlin oracle 与修正期望分开。两项 TypeScript 缺陷不伪报为升级已解决。
3. Rust 三 arm 样例 CCN 3，contributors 恰为第 4、5 行两项真实 `=>`；Kotlin expression/when 样例结束行/NLOC 分别 1/1、4/4，后续函数独立。其余变化由固定新版或明确偏差解释。
4. 公共 API 的位置、指标、完整贡献、Finding/waiver、exact artifact、installed Node consumer 与完整 Gate 通过；同一真实 corpus 的成本观测无未解释的可重复退化。

## Affected Owners

- [Function Metrics](../../docs/checks/function-metrics.md)、[scanner dependencies](../../docs/development/scanner-dependencies.md)：公开结果及私有分析链。
- [来源映射](../../docs/tooling/source-mapping.md)、[包材料](../../docs/tooling/package-artifact.md)、[包生命周期](../../docs/tooling/package-lifecycle.md)、[advisory](../../docs/tooling/lizard-upstream.md)：来源/法律/实际产物。
- [测试策略](../../docs/testing/strategy.md)、[Case](../../docs/testing/case-maintenance.md)、[性能](../../docs/tooling/lizard-performance.md)；[协调入口](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)拥有默认先升级后修复、独立提交/验收。
