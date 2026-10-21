---
title: "@secretlint/secretlint-rule-privatekey 13.0.7 升级价值"
id: "261021-assess-secretlint-privatekey-upgrade"
formedAt: "2026-10-21T03:30:30Z"
question: "Privatekey rule 13.0.5 至 13.0.7 是否增加检测能力，是否值得配套升级？"
tags:
  - "dependency-upgrades"
  - "privatekey"
  - "secret-detection"
  - "secretlint"
relations: []
---

## 形成时背景

调查时，本项目只启用这一项 Secretlint rule，根依赖/lockfile/安装与[发布 manifest](../../scripts/package/artifact/release-manifest.json)均为 `13.0.5`；[adapter](../../src/package-checks/secret-detection/secretlint/adapter.ts)直接传入其 `creator`，不采用推荐 preset 或远程校验。

## 调查目的

单独确认 rule 的新增内容与采用价值；core 的通用升级背景见[配套报告](./assess-secretlint-core-upgrade.md)。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/@secretlint/secretlint-rule-privatekey/latest)、[v13.0.5...v13.0.7 compare](https://github.com/secretlint/secretlint/compare/v13.0.5...v13.0.7)及 [13.0.7 release](https://github.com/secretlint/secretlint/releases/tag/v13.0.7)。最新稳定候选 `13.0.7`、Node `>=22`；本区间 privatekey 包只改 package.json，未见 rule 实现或私钥模式更新。

## 调查结果与边界

**建议：可选，与 core 一起维护到 13.0.7；没有足够证据单独优先升级。**

确证变化是包版本/同仓依赖对齐，而非新增私钥种类、降低误报或修复本项目泄密路径。CLI symlink/config 修复属于其他包的用途，不应归功于该 rule。由于固定 ruleId 与 ordinal/location 会参与 Findings 和 waiver，配套升级仍须比较 synthetic 私钥语料、非命中与 marker/line-column，不应只接受包能加载。

未来实施同时更新根 pin/lockfile/发布 manifest，并与 core 一起运行 secretDetection adapter、Check、leak-canary 与 installed-consumer evidence。未执行新版 rule，未证明检测等价性，也不对所有私钥覆盖作保证。
