---
title: "@secretlint/core 13.0.7 升级价值"
id: "261021-assess-secretlint-core-upgrade"
formedAt: "2026-10-21T03:30:24Z"
question: "Secretlint core 13.0.5 至 13.0.7 是否为本项目固定内存检测路径带来实质收益？"
tags:
  - "dependency-upgrades"
  - "secret-detection"
  - "secretlint"
relations: []
---

## 形成时背景

调查时，根、lockfile、安装及[发布 manifest](../../scripts/package/artifact/release-manifest.json)固定 `@secretlint/core@13.0.5`。[secretlint adapter](../../src/package-checks/secret-detection/secretlint/adapter.ts)直接调用 `lintSource`，传入内存文本与内联 privatekey rule，启用 maskSecrets/noPhysicFilePath；不运行 Secretlint CLI 或文件发现。

## 调查目的

判断 patch 升级价值，并区分整个 monorepo 的 CLI 修复与本项目实际 core 路径。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/@secretlint/core/latest)、官方 [13.0.6](https://github.com/secretlint/secretlint/releases/tag/v13.0.6)、[13.0.7](https://github.com/secretlint/secretlint/releases/tag/v13.0.7)与[两版间源码 compare](https://github.com/secretlint/secretlint/compare/v13.0.5...v13.0.7)。最新稳定 `13.0.7`，Node `>=22`。compare 中 core 包仅 package.json 变化，未发现 core 检测源码修改。

## 调查结果与边界

**建议：可选配套维护升级，非当前缺陷驱动的优先项。**

13.0.6 修复 CLI 查找文件跟随 symlink；13.0.7 修复 `--init --cwd`/既有 config 与空 baseDirectory 的 module resolution；还有依赖更新。当前内存调用与内联 rule 不走这些 CLI/配置加载路径，因此不能把它们描述为本项目已确认的检测准确性或安全能力提升，也不据依赖更新猜测 CVE 修复。

若升级，与[privatekey 包报告](./assess-secretlint-privatekey-upgrade.md)配套保持 `13.0.7`，同步根 pin/lockfile/发布 manifest。按[scanner owner](../development/scanner-dependencies.md)重跑 synthetic corpus、位置映射、异常协议、leak-canary、exact candidate 与 installed consumer；检查依赖图变化不向 Record/日志泄露源文本。未安装运行 13.0.7，检测等价性与 canary 通过均未证明。
