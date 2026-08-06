> **核心句：**本 change 将 Vibe Check 的版本化产品发布边界从单一 CLI surface 扩展为同时交付 CLI、公共 TypeScript 声明文件（`.d.ts`）与明确公开资源的 npm package；本 proposal 只固定已确认范围，具体 package interface 与实现设计尚待后续讨论。

## Why

Project Definition、自定义 Check、公共类型与产品资源要求消费者获得相互匹配的
execution 与 authoring 材料；只把 Vibe Check 当作本地 CLI 无法完整表达这一发布边界。

## What Changes

- 以一个可版本化的 npm package 作为 Vibe Check 产品发布单元。
- 同一 package version 共同交付正式 CLI、受支持的公共 TypeScript 声明文件（`.d.ts`）和明确公开的产品资源。
- CLI 保持主要执行界面及其现有行为 owner，但不再与完整产品发布边界等同。
- 稳定承诺前使用唯一且递增的 `0.0.<patch>` package versions。

## Capabilities

### New Capabilities

- `package-release`: 定义 npm package 发布单元、同版本材料边界、预稳定版本约束与发布制品验收的长期 owner。

### Modified Capabilities

本探索阶段不声明对现有 capability 的修改。后续设计将核对 `product-runtime`、
`cli-contract`、`output-contract` 及相关 active changes；只有其现有 requirement 确实改变时，
才更新本 proposal 并增加对应 delta。

## Scope Boundaries

- 只有明确公开的 commands、module exports 和 product materials 进入 package contract；npm 载体本身不会把内部 Core、扫描函数或偶然 tarball path 提升为 public API。
- 本 planning change 不授权执行外部 `npm publish`。未来实际发布仍需要当次任务明确授权。
- Package name、command/module subpaths、export map、声明组织、资源访问、build/pack 结构、实施顺序、首个 `0.0.<patch>` 值，以及发布验收的具体命令与证据均为尚待收敛的设计输入。

## Impact

预期影响 package metadata、产品 build/declaration 产出、CLI 可安装入口、显式 public
exports/resources、runtime dependency 与 platform prerequisite 边界、pack/install 验收、
发布文档以及后续会修改公共类型和材料的 active changes。当前不固定精确文件、依赖和实施顺序。
