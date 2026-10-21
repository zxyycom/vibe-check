---
title: "minimatch 10.2.6 升级价值"
id: "261021-assess-minimatch-upgrade"
formedAt: "2026-10-21T03:30:49Z"
question: "minimatch 10.2.5 至 10.2.6 是否为本项目 glob 匹配带来值得采用的修复？"
tags:
  - "dependency-upgrades"
  - "glob"
  - "minimatch"
relations: []
---

## 形成时背景

调查时，根声明 `^10.2.5`，lockfile/安装 `10.2.5`。[Bun test file discovery](../../scripts/test-evidence/discovery/bun-files.ts)与 [Oxfmt failure records](../../scripts/project/gate/checks/oxfmt-failure-records.ts)使用 minimatch；不是 Product 文件收集的 micromatch 替代品。

## 调查目的

核对 patch 的真实内容，避免把新增测试误说成 matcher 修复或安全修复。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/minimatch/latest)与官方 [v10.2.5...v10.2.6 compare](https://github.com/isaacs/minimatch/compare/v10.2.5...v10.2.6)。最新稳定 `10.2.6` 在根 range 内，Node `18 || 20 || >=22` 支持 Node 24。

## 调查结果与边界

**建议：可选低风险维护升级，不是已确认缺陷的优先修复。**

compare 显示更新开发依赖/CI、补强 Windows `..`/drive-letter 测试，运行时 `brace-expansion` 声明从 `^5.0.5` 改为 `^5.0.8`；未见 minimatch `src/**` 实现修改。因此不声称 10.2.6 才修复 Windows matcher 或某 CVE；本轮也未审计 brace-expansion 的完整传递变化。

升级后重跑 test file discovery、Oxfmt failure-record tests 与 test-evidence closure，关注 brace 展开、negation、Windows separators/drive roots 和 ignore membership。只需根 range/lockfile维护，不应联动改 Product micromatch/fast-glob。未安装执行 10.2.6，不能宣称传递解析结果或所有 glob 输出等价。
