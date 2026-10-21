---
title: "Oxlint 1.89.0 升级价值与配套边界"
id: "261021-assess-oxlint-upgrade"
formedAt: "2026-10-21T03:31:01Z"
question: "Oxlint 1.78.0 至 1.89.0 是否值得升级，怎样维持当前阻断规则和 type-aware 配套？"
tags:
  - "dependency-upgrades"
  - "lint"
  - "oxlint"
relations: []
---

## 形成时背景

调查时，根声明 `^1.78.0`，lockfile/安装 `1.78.0`，搭配 `oxlint-tsgolint@7.0.2001`。[lint.ts](../../scripts/development/lint.ts)通过仓库入口执行 Product/scripts scopes；[.oxlintrc.json](../../.oxlintrc.json)启用 typeAware、显式规则、unused-disable warning 并禁用 ESLint directive，`--deny-warnings` 使 warning 仍然阻断。

## 调查目的

评估规则正确性及配套风险，不将新 recommended rules 自动当作已批准的质量策略。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/oxlint/latest)、官方 [1.79](https://github.com/oxc-project/oxc/releases/tag/apps_v1.79.0)、[1.86](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.86.0)、[1.88](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.88.0)、[1.89](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.89.0)材料及[workspace lint owner](../tooling/workspace.md#development-tooling)。最新稳定 `1.89.0` 在根 range 内；Node `^20.19.0 || >=22.12.0` 支持 Node 24。latest manifest 要求 type-aware peer `oxlint-tsgolint >=7.0.2003`，现有安装不满足。

## 调查结果与边界

**建议：优先与 oxlint-tsgolint 7.0.2004 配套验证升级，不单独换 Oxlint。**

确证与当前规则有关的变更包括：`no-unused-vars` 的参数/rest/sequence-use 解释，`no-non-null-asserted-optional-chain` 的后续链检测、`import/no-duplicates` 区分 import attributes、parameter-property reassignment，以及 type-aware diagnostics 共用 source。这些关系到当前 Gate 的误报/漏报与诊断成本，但本轮未证明当前代码存在漏检或测出提速。

1.89 批量标记 upstream recommended rules；当前配置并非一律采用 recommended，仍须检查 correctness category 与显式 rule 的合成结果，避免悄悄改变阻断 policy。release 中若干 BREAKING 项属于底层 Rust AST 或未启用 React rules，不应误判为当前 CLI 全面不可用，也不能因此跳过验收。

实施时在同一变更更新根 range/lockfile 与配套 peer，跑两个 scope 的 `bun run lint -- product` / `bun run lint -- scripts` 公开入口、process/Gate diagnostic adapter evidence，审阅新增/消失的每条诊断与 unused directives；不先 auto-fix 或调 severity 消除差异。未安装/执行新版，当前 config 可接受性、实际规则集合和性能待验证。
