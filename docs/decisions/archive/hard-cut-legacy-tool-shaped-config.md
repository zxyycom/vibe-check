---
title: 对旧 tool-shaped project config 执行 hard cut
status: archived
alignment: aligned
createdAt: 2026-08-03T09:23:47Z
purpose: 一次性建立无底层工具字段的语义配置边界，避免双读、静默忽略和 executable precedence 风险。
background: 旧配置包含 tool-named thresholds 与 command/args；兼容读取会延长 public coupling 和 executable precedence 风险。
decision: 新 runtime 在 scan work 前拒绝旧 shape 并提供迁移诊断，不兼容读取，也不执行旧 command/args。
tags:
  - configuration
relations: []
---

## 目的
- 让 semantic project config 从首次发布开始只有一套 field tree、precedence 和 dependency
  boundary，不留下无法可靠移除的 legacy reader。
- 确保旧 project-level executable settings 不会被静默忽略、误映射或继续参与 scanner 启动。
- 给已有显式配置提供可行动且可恢复的一次性迁移，而不是隐藏行为变化。

## 背景
- 当前 explicit complete config 包含顶层 `lizard`、`scc`、`jscpd` 和 `tools`；后者允许配置
  command/args。
- External discovery 和 initializer 尚未发布，因此可以在生成第一份可发现配置前完成语义
  hard cut，避免先公开已知短命的 tool-shaped starter 再迁移。
- 限时 dual reader 仍需定义两个 schema、identity、precedence、warning 和移除期限，并可能
  执行调用者以为仍然有效的旧 executable settings。

## 决策
- 采用: 新 runtime 识别旧 tool-shaped top-level fields 时，在 banner、scanner、baseline、
  cache 和 artifact creation 前以 config error / exit `3` 拒绝 document。
- 采用: Diagnostic 必须给出 selected path、current version、old-to-new semantic field mapping
  和 dependency operational landing guidance；不得读取或执行旧 command/args。
- 采用: Owner docs 提供一次性 migration table 和 canonical semantic example；旧完整 config
  不作为 accepted fixture、fallback 或第二套 schema 保留。
- 采用: Rollback 以 binary/config pair 为单位；回退旧 binary 时同时恢复旧 config，新 binary
  不承诺读取旧 shape。
- 不采用: 限时或永久 compatibility reader、静默删除 unknown tool fields、partial merge，或
  从旧 project config 向 internal dependency snapshot 复制 executable settings。
