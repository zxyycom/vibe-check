---
title: "jscpd 5.1.1 至 5.4.2 升级价值与计量风险"
id: "261021-assess-jscpd-upgrade"
formedAt: "2026-10-21T03:30:36Z"
question: "jscpd 新版是否值得作为 duplicateDetection baseline，以及哪些检测与计量变化必须验收？"
tags:
  - "dependency-upgrades"
  - "duplicate-detection"
  - "jscpd"
relations:
  - type: "复查"
    target: "260901-assess-scc-and-jscpd-upgrade-readiness"
    summary: "在5.1.1基线下复查后续5.x检测与计量升级"
---

## 形成时背景

调查时，根 devDependency、lockfile 与安装为 `5.1.1`，而[发布 manifest](../../scripts/package/artifact/release-manifest.json)已声明 runtime `^5.1.1`，新 consumer 可能解析到新版。[前序](./assess-scc-and-jscpd-upgrade-readiness.md)在 2026-09-01 调查 5.0.11→5.1.1；本轮从不同 baseline 复查后续 5.x，而非复用旧“latest”结论。

## 调查目的

评估对实际 JSON/exact-scope adapter 的收益、分发与 Findings 漂移，不引入 semantic、MCP 或新公开检测选项。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/jscpd/latest)及官方 [5.1.2](https://github.com/kucherenko/jscpd/releases/tag/v5.1.2)、[5.2.0](https://github.com/kucherenko/jscpd/releases/tag/v5.2.0)、[5.2.1](https://github.com/kucherenko/jscpd/releases/tag/v5.2.1)、[5.3.2](https://github.com/kucherenko/jscpd/releases/tag/v5.3.2)、[5.4.2](https://github.com/kucherenko/jscpd/releases/tag/v5.4.2)。最新稳定 `5.4.2`，Node `>=18`；若只需更窄补丁，`5.1.2` 是保守候选。

读取[scanner](../../src/package-checks/duplicate-detection/jscpd/scanner.ts)、[JSON parser](../../src/package-checks/duplicate-detection/jscpd/json-report.ts)及[scanner owner](../development/scanner-dependencies.md)：显式临时 config 只传 approved exact paths、阈值与 JSON/silent/absolute，version 参与 raw cache identity。

## 调查结果与边界

**建议：优先评估 5.4.2，收益比只升 5.1.2 更实质；必须接受计量差异审阅，不能按同 major 宣称结果等价。**

- 5.1.2 新增 Linux ARM64 musl、修正命令名/Windows drive-anchored pattern；适合仅有平台阻断时的小步候选，但缺少后续检测修复。
- 5.2.0 修复 JS/TS 可恢复 parse error 导致 fallback tokenizer 与干净文件不匹配、Markdown 把 URL/`/*` 当注释、Vue 模板 clone ranges；5.2.1 修复跨文件延伸 clone、缺失路径/无效 format/报告写失败可能伪空成功。它们直接关联当前 scanner 的完整结果与范围验收。
- 5.3.2 改正嵌入代码统计与 inclusive duplicated-line 计数（旧计数少一行）；5.4.2 修复 Markdown front matter 跨 fence panic、未闭合 fence 二次成本、JSON embedded-file name 等。即使不用新选项，也可能改变普通扫描的 Findings/行数/阈值结果。
- 新版还增加 boundary、similarity、semantic、LSP 等独立能力；本 adapter 未请求这些功能，不因此下载模型、调用远端或扩大 Product options。

未来验收比较冻结多语言语料上的 pair/path/range/lines/tokens 与最终 Findings；不能为保留旧错误计数静默调阈值。检查 additive JSON 是否被当前 parser 安全忽略、embedded names 是否仍匹配 exact membership、version cache miss、wrapper/bin containment 与八平台分发。先验证实际 wrapper/engine 同版，再跑 Node 24 installed candidate 与 Gate；repository 和 consumer 的范围/精确版本分别证明。

未安装或执行 5.4.2，未证明 JSON 实际兼容、阈值净影响或性能。前序关系为“复查”，保留不同上游窗口与 baseline 的独立认识。
