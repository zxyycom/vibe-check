> **核心句：**本 change 将 Vibe Check 的版本化产品发布边界从单一 CLI surface 扩展为同时交付 CLI、公共 TypeScript 声明文件（`.d.ts`）与明确公开资源的 npm package；本 proposal 只固定已确认范围，具体 package interface 与实现设计尚待后续讨论。

## Why

Project Definition、自定义 Check、公共类型与产品资源要求消费者获得相互匹配的
execution 与 authoring 材料；只把 Vibe Check 当作本地 CLI 无法完整表达这一发布边界。

## What Changes

- 以一个可版本化的 npm package 作为 Vibe Check 产品发布单元。
- 同一 package version 共同交付正式 CLI、受支持的公共 TypeScript 声明文件（`.d.ts`）和明确公开的产品资源。
- CLI 保持主要执行界面及其现有行为 owner，但不再与完整产品发布边界等同。
- 稳定承诺前使用唯一且递增的 `0.0.<patch>` package versions。

## Current Baseline

- 正式本地产品入口仍由仓库通过 Bun 直接运行 `src/product/**`；当前可运行源码不是已经验收的
  npm release artifact。
- 当前根 `package.json` 仍承担仓库开发元数据：它标记为 private，版本仍为 `0.1.0`，且没有定义
  package `bin`、public `exports`、`types` 或发布文件白名单。
- 仓库尚无从权威产品源码生成候选 package、在隔离消费环境安装该候选 package，并共同验证
  CLI、公共声明与公开资源的发布证据。

上述内容描述本次探索核对时的实现事实，不覆盖长期决策或本 change 的目标状态；实施准备时必须
重新核对。

## Release Stages and Terms

本 change 使用以下三个阶段区分仓库内产物准备与外部发布操作：

1. **Build**：从权威产品源码生成目标 runtime、公共 TypeScript 声明文件和选定资源；具体输出形态
   尚待设计。
2. **Pack and candidate validation**：按受控 package 内容规则形成候选 tarball，并在隔离消费环境安装
   该候选 artifact，验证 package 实际交付的 CLI、声明、资源和运行前置条件。
3. **Publish**：把已验收的 package name 与 version 写入目标 npm registry。该外部写入不是 build、pack、
   测试或 OpenSpec apply 自动隐含的步骤，仍需要执行当次任务明确授权。

Package release 验收必须针对实际候选 artifact，而不是用工作树源码能够运行来代替。具体命令、发布
registry、身份和自动化方式仍属于开放问题。

## Capabilities

### New Capabilities

- `package-release`: 定义 npm package 发布单元、同版本材料边界、预稳定版本约束与发布制品验收的长期 owner。

### Modified Capabilities

本探索阶段不声明对现有 capability 的修改。后续设计将核对 `product-runtime`、
`cli-contract`、`output-contract` 及相关 active changes；只有其现有 requirement 确实改变时，
才更新本 proposal 并增加对应 delta。

## Scope Boundaries

- 只有明确公开的 commands、module exports 和 product materials 进入 package contract；npm 载体本身不会把内部 Core、扫描函数或偶然 tarball path 提升为 public API。
- npm package 只确定版本化分发载体，不自动把产品 runtime 改为 Node.js；已安装 CLI 使用 Bun、Node.js
  或其它构建结果，必须由明确的 runtime contract 与隔离安装证据决定。
- Package artifact 是从 `src/product/**` 的权威实现形成的发布投影，不建立第二套手工维护的产品源码、
  声明或资源事实源。
- 本 planning change 及未来未经外部写入授权的 apply 任务不执行 `npm publish`。实际 registry 发布是
  独立的授权边界。

## Dependencies and Interactions

- `establish-check-record-core` 负责 Check、Record 与 DecisionPolicy 的领域 contract 及其源码级公共类型；
  本 change 负责这些已确认公共材料如何进入 package exports、declarations 与发布验收。其
  `public exports` 任务不得独立固定 package path 或 export map。
- `adopt-typescript-project-definition` 当前把 `vibe-check/project` 写作 optional authoring entrypoint。
  该引用形成真实的 package interface 需求，但 exact package name、subpath 与 export map 必须在本 change
  收敛，并在两个 changes 进入实施前消除不一致。
- `establish-check-task-orchestration` 继续拥有运行时调度行为；本 change 只负责其必要 runtime content、
  dependencies 或 platform prerequisites 怎样随 package version 得到满足，不重新定义调度 contract。
- 上述 active changes 的实现顺序尚未确定。实施准备必须选择不会让某个 change 先偶然冻结 package
  interface、又由另一个 change 返工的顺序或分片方式。

## Open Questions

1. **Registry identity and ownership**：首个 release 面向哪个 npm registry；使用无 scope 的
   `vibe-check`、scoped name 或其它 package name；由个人账号还是 organization 持有发布权限？Package
   name 可用性和 registry 认证规则属于会变化的外部事实，确定名称和实际发布前必须按 npm 官方来源重查。
2. **Installed runtime and CLI**：安装后的 command 名称和调用方式是什么；CLI 明确要求 Bun，还是生成
   Node.js-compatible 或其它可分发结果；如何声明并诊断 platform prerequisites？
3. **Public module and resource interface**：哪些 authoring types/helpers 获得 public module subpath；
   是否采用 `vibe-check/project`；declarations、runtime validators、schemas、templates 与其它 built-in
   materials 通过 exports、API 还是明确资源路径访问？
4. **Build and package contents**：runtime/declarations 的 source of truth、构建方式、tarball layout、
   package file whitelist、runtime dependencies 与 external tools 如何划分？
5. **Candidate acceptance**：隔离安装要证明哪些 CLI、typecheck、module import、resource access、dependency
   和 platform behaviors；由哪些可复现命令证明候选 tarball 与预期 package contract 一致？
6. **Release authorization and automation**：首个唯一 `0.0.<patch>` 值是什么；首次发布由人工完成还是
   配置 Trusted Publishing；registry credentials 或 trust relationship 由谁管理；哪一个明确授权的任务
   才能执行外部发布？
7. **Implementation sequencing**：本 change 与三个相关 active changes 按什么顺序或分片进入实施，才能
   让领域 contract、package interface、runtime content 和验收证据各自由正确 owner 建立且不互相返工？

这些问题在探索阶段保持开放。进入实施准备前必须把答案写入对应 owner，并同步任何受影响 change；
不得由 agent 根据当前 `package.json`、一次 registry 查询、工具默认值或相邻 change 的暂定路径自行推断。

## Impact

预期影响 package metadata、产品 build/declaration 产出、CLI 可安装入口、显式 public
exports/resources、runtime dependency 与 platform prerequisite 边界、pack/install 验收、
发布权限与自动化文档，以及后续会修改公共类型和材料的 active changes。当前不固定精确文件、
依赖、registry identity、外部发布方式和实施顺序。
