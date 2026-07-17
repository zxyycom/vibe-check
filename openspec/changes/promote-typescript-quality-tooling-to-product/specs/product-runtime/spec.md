本 change 的目标是先移除 Rust 产品路径，再把成熟的 TypeScript 质量脚本按现有行为上移为仓库自有产品源码；本 spec 仅形成待审计临时 delta，不修改现有主规范或其它 change。

## ADDED Requirements

### Requirement: TypeScript 是唯一产品实现
系统 MUST 由 `src/product/**` 下的仓库自有 TypeScript/Bun 源码提供质量扫描产品能力，并且 MUST 不保留 Rust 产品执行路径。

#### Scenario: Rust 产品路径已删除
- **WHEN** 检查产品源码、构建配置、package scripts 和 workspace 验证定义
- **THEN** 不存在可构建或可调用的 Rust Vibe Check 产品入口

#### Scenario: 产品源码闭包由仓库所有
- **WHEN** 从正式产品入口追踪运行时 import
- **THEN** 所有运行时源码均位于 `src/product/**`，且没有 import `scripts/**` 或 toolkit gitlink

### Requirement: 上移保持既有扫描行为
系统 SHALL 在源码上移后保持迁移前 TypeScript 脚本的 profile、参数、固定 scanner 栈、指标、warning、baseline、artifact 和状态映射语义；除源码位置和最薄入口接线外，本 change MUST 不引入行为重写。

#### Scenario: quick 扫描保持一致
- **WHEN** 对同一 source revision 和等价选项分别运行迁移前脚本与正式产品入口的 quick profile
- **THEN** 两者产生相同的扫描范围、指标、warning 状态、业务 artifact 和成功或失败结果

#### Scenario: full baseline 扫描保持一致
- **WHEN** 对同一 current revision、baseline revision 和等价选项分别运行迁移前脚本与正式产品入口的 full profile
- **THEN** 两者产生相同的 current/baseline 比较、changed warning、完整 warning、报告数据和成功或失败结果

#### Scenario: 非语义输出差异受限
- **WHEN** parity 校验发现时间戳、绝对根路径或工具环境元数据之外的输出差异
- **THEN** 迁移验收失败，且不得把该差异作为源码移动的一部分接受

### Requirement: 正式入口和 dogfood 入口共享同一核心
系统 SHALL 提供 `bun run product:cli -- scan [project-root]` 作为正式本地入口，并 SHALL 让仓库 `quality:*` 命令通过薄 wrapper 调用同一产品实现。

#### Scenario: 正式入口执行扫描
- **WHEN** 调用者运行 `bun run product:cli -- scan [project-root]` 并传入现有 scan flags
- **THEN** 产品入口把归一化 project root 和 flags 交给上移后的扫描实现

#### Scenario: 旧仓库命令继续 dogfood
- **WHEN** 仓库 automation 调用保留的 `quality:check`、`quality:full-check` 或 `quality:scan`
- **THEN** 命令执行 `src/product/**` 中的同一扫描核心，而不是第二套 scripts 实现

### Requirement: 首次产品化不扩展能力范围
本 change MUST 不改变现有扫描依赖选择、配置语义、输出契约、gate policy 或已知缺陷行为；这些变化 MUST 通过后续独立 change 规划和验收。

#### Scenario: 迁移 diff 接受范围
- **WHEN** reviewer 审查 `src/product/**` 与固定来源快照的差异
- **THEN** 每项差异都能归类为路径调整、入口接线、仓库所有权、测试搬移或必要构建接线

#### Scenario: 发现需要功能修复
- **WHEN** 移动过程中发现不由源码位置变化造成的既有行为问题
- **THEN** 当前 change 记录该问题但不修改其语义，并为后续独立 change 保留处理入口
