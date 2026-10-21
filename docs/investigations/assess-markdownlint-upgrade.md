---
title: "markdownlint 0.41.1 至 0.42.0 升级价值"
id: "261021-assess-markdownlint-upgrade"
formedAt: "2026-10-21T03:30:12Z"
question: "markdownlint 0.42.0 的修复是否值得采用，哪些 Findings 与 cache 边界需要验证？"
tags:
  - "dependency-upgrades"
  - "markdown-lint"
  - "markdownlint"
relations: []
---

## 形成时背景

调查时，根依赖、lockfile、安装与[发布 manifest](../../scripts/package/artifact/release-manifest.json)均为 `0.41.1`。[私有 adapter](../../src/package-checks/markdown-lint/adapter.ts)只启用九项映射规则，以 Promise strings API、固定 frontMatter regex、`noInlineConfig:true` 解析，并拒绝异常结果形状。

## 调查目的

区分规则准确性/正则防护收益与公开规则范围变化，给出升级及 cache 验收边界。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/markdownlint/latest)和官方 [0.42.0 changelog](https://github.com/DavidAnson/markdownlint/blob/v0.42.0/CHANGELOG.md)。latest 稳定候选 `0.42.0`；Node `>=22` 与 Node 24 相容。读取 adapter 及[findings cache](../../src/package-checks/markdown-lint/findings-cache.ts)，不把 0.x minor 视为无需语义验收的 patch。

## 调查结果与边界

**建议：优先验证后升级到 0.42.0，收益明确但可能改变 Findings。**

官方记录改进 MD011/MD018/MD020/MD043/MD051/MD055/MD060、增加正则拒绝服务防护和 front matter issue reporting。MD011、MD018 属于本项目默认规则，MD051 是可选 `link-fragments`，故有实际规则修复覆盖；其余规则和新能力不自动成为公开选项。防护属上游确证变更，本轮未证明本项目固定配置下的具体可利用输入。

升级必须对比受影响规则的 Findings、行列范围、front matter、链接片段与 waiver identity；确认固定九规则配置未因新增 front matter reporting 产生不识别的协议结果。cache 已包含 backend version，版本变化应失效；若 adapter 解释/配置随之改变，再由 owner 提升内部契约版本，不能假设旧 cache 可复用。

同步根 pin/lockfile 与发布 manifest，执行 adapter/Check/cache evidence、文档验证及 exact candidate consumer。未安装或运行 0.42.0；不能声称当前语料的 Finding 数量、阻断结果或正则最坏时长不变。
