---
title: 使用常规 JSON 文件名承载带注释配置
status: archived
alignment: null
createdAt: 2026-08-03T08:45:26Z
purpose: 降低项目配置的识别和采用门槛，同时保留注释、尾随逗号与 editor schema 辅助。
background: JSONC 扩展名能精确标识语法，但相对不常见；固定工具目录和文件名已经能提供产品格式上下文。
decision: 发现文件固定为 .vibe-check/config.json，内容允许注释和尾随逗号，但不把它描述成严格 JSON。
relations: []
---

## 目的
- 让外部项目使用熟悉、容易被发现的 JSON 文件名，不要求调用者先理解独立的 JSONC 文件类型。
- 保留生成配置中的说明性注释、尾随逗号容错、相对 `$schema` 和严格字段校验。

## 背景
- `.jsonc` 能诚实表达 comments/trailing-comma grammar，但 editor、代码托管界面和通用工具对
  该扩展名的识别并不一致，额外扩展名本身会增加采用风险。
- `.vibe-check/` tool directory 和固定 `config.json` 名称已经提供足够的产品上下文；Vibe
  Check loader 可以按内容契约解析，而不依赖 extension 选择 parser。
- 带注释的文件不是标准严格 JSON。使用 `.json` 文件名不能转化为“任意 strict JSON parser
  都能读取”的兼容承诺，help、schema 和错误信息必须明确 Vibe Check 允许的语法。

## 决策
- 采用: 省略 `--config` 时只发现 `<project-root>/.vibe-check/config.json`；初始化和 dogfood
  也使用该文件名，不并行发现 `.jsonc` alias。
- 采用: Public wording 优先称其为 Vibe Check JSON config，并明确支持 line/block comments
  与 trailing commas；JSONC parser 是实现事实，不把 `.jsonc` 扩展名设为用户前置概念。
- 采用: 标准严格 JSON 保持该内容契约的兼容子集；显式 `--config` 仍按内容解析，不根据 file
  extension 切换 schema、precedence 或 merge behavior。
- 不采用: 为了扩展名语义纯度而把固定 discovery file 命名为 `config.jsonc`，或同时发现
  `.json` / `.jsonc` 并引入选择优先级。
