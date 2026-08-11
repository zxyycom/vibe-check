## Purpose

定义 Vibe Check 以受控 npm package 同版本交付正式 CLI、公共 TypeScript 声明文件（`.d.ts`）与明确公开资源的发布边界，并为预稳定版本和发布验收提供长期契约 owner。

## ADDED Requirements

### Requirement: Versioned npm package is the product release unit

Vibe Check SHALL 以一个版本化 npm package 作为产品发布单元。每个发布的 package
version MUST 共同交付以下内容：

- 正式 CLI；
- 该版本支持的公共 TypeScript 声明文件（`.d.ts`）；
- CLI 运行必需内容；
- 该版本明确承诺给消费者的 schema、模板或其它产品材料。

CLI MUST 保持主要执行界面，但 package release contract MUST NOT 把 CLI surface
当作完整产品边界的同义词。

#### Scenario: One package version provides matching product materials

- **WHEN**发布验收在隔离消费环境安装并检查一个 Vibe Check package version
- **THEN**该 package 的正式 CLI、受支持公共声明和所声明的公共产品材料都来自该 package version
- **AND**验收不要求消费者从仓库源码、单独下载或未版本化路径补齐这些材料

### Requirement: Only explicit package surfaces are public

Package release contract SHALL 只把明确声明的 commands、module exports 和 public materials
视为受支持界面。Tarball 中的偶然路径、内部 Core、扫描函数和未显式导出的实现细节
MUST NOT 因为随包存在就成为 public API。

#### Scenario: Incidental tarball paths do not create API

- **WHEN**发布制品包含未在 package contract 中声明的内部文件或路径
- **THEN**消费者不获得对这些文件或路径的稳定性、可导入性或兼容性承诺

### Requirement: Prestable releases remain on the 0.0.x line

在产品 owner 明确确认开始稳定承诺前，Vibe Check package versions MUST 使用唯一且递增的
`0.0.<patch>` 值。两个 `0.0.x` package versions 之间 MUST NOT 默认提供 package-level 兼容性；
发布材料 MUST 说明破坏式更新风险和精确锁定建议。已由更具体 public identity 或独立决策建立的
强稳定性约束 MUST 继续遵守其自身 contract。

#### Scenario: A release occurs before stable commitment

- **WHEN**产品 owner 尚未明确确认进入非零 minor 稳定版本线
- **THEN**新 package release 使用一个大于所有既有 `0.0.x` package release patch 的唯一 `0.0.<patch>` version
- **AND**安装与发布材料不把 patch 增长表述为 package-level 兼容保证
