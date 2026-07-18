# Add Explicit Scan Configuration

## Why

正式 CLI 接受任意 `project-root`，但当前 `runScan` 始终使用面向 Vibe Check 仓库的
`DEFAULT_CONFIG`。外部项目无法提供自己的完整配置，因此“传入任意项目根”还不能真正按
该项目的规则执行检查。

仓库也缺少一份可由正式入口扫描的外部项目 fixture，无法端到端证明显式配置已经替换默认
配置并影响扫描结果。

## What Changes

- 为 `scan` 增加单值 `--config <file>`。
- 配置文件使用 JSON，内容直接对应完整 `QualityConfig`；不增加另一套字段模型。
- 指定配置后，该对象整体替换 `DEFAULT_CONFIG`，不做 partial merge、字段重命名或隐式
  defaulting。
- 未指定 `--config` 时继续使用当前 `DEFAULT_CONFIG`。
- 配置文件读取、JSON 解析或 `QualityConfig` 结构解析失败时立即报错，不启动扫描，也不
  回退到默认配置。
- 在 `fixtures/projects/configured-typescript/` 建立最小外部 TypeScript 项目，通过正式
  Product CLI 证明完整配置驱动 scope、code area、warning 和 artifacts。

## Scope

本 change 负责 `--config` 参数、完整 JSON config parser、整体替换行为、错误映射、外部
项目 fixture、正式入口验收和 owner docs。

本 change 不增加配置自动发现、继承、多文件合并、JavaScript / TypeScript 配置执行、
partial config、preset、`init`、新 scanner 或新 warning rule。

## Capabilities

### New Capabilities

- `scan-configuration`: 定义完整 JSON `QualityConfig` 的选择、解析、替换和失败行为。

### Modified Capabilities

- `cli-contract`: 增加 `--config <file>` 及 help、路径与 error behavior。
- `scan-scope`: current、baseline 与 fallback collection 使用本次选中的完整 config。
- `test-fixtures`: 增加可由正式入口扫描的 external project fixture。

## Impact

- 主要影响 `src/product/args.ts`、`src/product/scan.ts`、`src/product/config.ts` 与新增的
  config parser。
- Core 继续只接收 `QualityConfig`；JSON 与 config path 停留在 CLI / Config boundary。
- 需要同步 CLI、Scan Scope、Testing 与 configuration owner docs、fixture example、case
  ledger 和正式入口 tests。
- 未指定 `--config` 的正式入口与 dogfood wrapper 必须保持兼容。
