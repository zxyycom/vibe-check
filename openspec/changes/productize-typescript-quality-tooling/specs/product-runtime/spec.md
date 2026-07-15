本 capability 定义现有 TypeScript quality tooling 成为 Vibe Check 产品核心后的长期 runtime 与源码所有权；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: TypeScript product control plane
Vibe Check 产品 SHALL 以 TypeScript/Bun 控制面执行正式 CLI、scan planning、baseline、cache、metrics aggregation、warning、gate、diagnostics 和 report/artifact projection。现有 quality tooling 的这些能力 MUST 作为产品实现继续演进，而不是由 Rust CLI 或新的平行业务核心重新实现。

#### Scenario: 正式调用进入 TS 产品核心
- **WHEN** 用户通过正式 Vibe Check 产品入口启动质量扫描
- **THEN** invocation 进入 TS/Bun product core
- **AND** scan planning、warning、gate 和 report 不委托给平行 Rust product pipeline

### Requirement: Modular monolith ownership
Vibe Check SHALL 作为单仓模块化单体拥有 CLI、product core、backend adapters、领域模型和 release assembly。内部模块 MAY 按职责分区，但 MUST NOT 仅为跨产品复用而要求独立仓库、独立 revision 或网络服务。

#### Scenario: 内部模块共同发布
- **WHEN** Vibe Check 生成一个产品 release
- **THEN** CLI、product core 和内建 backend adapters 从同一产品 revision 构建
- **AND** release 不依赖 Docnav 或共享 infrastructure 仓库的同步 checkout

### Requirement: Self-contained product source
产品运行路径使用的 `quality-core`、foundation helper 和 task-runner 能力 SHALL 由 Vibe Check 仓库直接拥有。一次性迁入 MUST 记录来源 revision 和适用许可证；迁入完成后产品 build MUST NOT 要求初始化对应 git submodule 或从其它仓库源码 import。

#### Scenario: 新 checkout 构建产品
- **WHEN** 开发者获取 Vibe Check 主仓库并按产品构建说明准备依赖
- **THEN** product source 已包含构建正式 CLI 所需的 quality core 与 runtime helpers
- **AND** 构建不要求初始化旧 toolkit gitlinks

### Requirement: Product and development dependency direction
仓库开发脚本、workspace verifier 和 dogfooding automation MAY 调用正式 product API 或 CLI；product core MUST NOT 导入只服务仓库维护的 validators、verification definitions 或 release scripts。

#### Scenario: 开发验证复用产品实现
- **WHEN** workspace quality check 执行与正式产品相同的扫描能力
- **THEN** 开发入口调用 product core 或正式 CLI
- **AND** product core 不依赖 workspace verifier 才能运行
