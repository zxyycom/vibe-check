---
title: "oxlint-tsgolint 7.0.2004 升级价值"
id: "261021-assess-oxlint-tsgolint-upgrade"
formedAt: "2026-10-21T03:31:07Z"
question: "type-aware engine 7.0.2001 至 7.0.2004 是否改善本项目已启用规则，怎样与 Oxlint 配套？"
tags:
  - "dependency-upgrades"
  - "lint"
  - "oxlint-tsgolint"
  - "type-aware-lint"
relations: []
---

## 形成时背景

调查时，根声明 `^7.0.2001`，实际安装与锁定 `7.0.2001`。[.oxlintrc.json](../../.oxlintrc.json)已启用 no-floating-promises、no-unsafe-return、no-deprecated、strict-boolean-expressions 等类型规则，且测试文件为 Bun/node:test 设置 safe-call 声明来源。它是 Oxlint 的配套类型引擎。

## 调查目的

识别当前配置直接消费的规则修复及 peer 限制，而非把上游 benchmark 当本仓库结果。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/oxlint-tsgolint/latest)、官方 [7.0.2002](https://github.com/oxc-project/tsgolint/releases/tag/v7.0.2002)、[7.0.2003](https://github.com/oxc-project/tsgolint/releases/tag/v7.0.2003)、[7.0.2004](https://github.com/oxc-project/tsgolint/releases/tag/v7.0.2004)，并核对 [Oxlint latest peer](https://registry.npmjs.org/oxlint/latest)。最新稳定 `7.0.2004` 在现声明范围内。

## 调查结果与边界

**建议：优先采用，和 Oxlint 1.89.0 配套做一次可审阅升级。**

7.0.2004 修复 no-floating-promises 的 safe-call declaration source 判定，直接关联本仓库测试的 allowForKnownSafeCalls；还修复 no-unsafe-return 的 deferred indexed return 和无 return 的 JSDoc callback panic、no-deprecated 原因信息。7.0.2002/2003 对 nullable narrowing、necessary type assertions、no-deprecated shorthand aliases、多条已启用规则的检查/诊断成本有修正。这些有实际配置交集，优先级高于纯新增未用规则。

Oxlint 1.89.0 要求该 peer `>=7.0.2003`；7.0.2004 满足，但仍须实际验证 engine 协议与 Bun/Node 24 工具入口。不要把版本号中的 `7.0` 当作项目必须同步迁移 TypeScript compiler API 到 TS7 的理由：该 engine 的内部编译器与仓库 `typescript` API consumer 是不同责任。

升级后运行 Product/scripts lint scopes、测试 safe-call 正负例、Gate diagnostic 输出验收，比较 no-floating-promises/no-unsafe-* 的诊断漂移；上游 perf commit 只支持“可能减少成本”，本项目收益需实测。未安装执行新引擎，兼容性及本地时间/内存改进未证明。
