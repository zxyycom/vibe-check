本 capability 定义 Vibe Check 以自包含平台便携目录交付 TS/Bun 控制面和内建 scanner 的长期分发边界；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Self-contained portable directory
每个平台 Vibe Check release SHALL 作为解压即用的便携目录交付，并包含运行正式控制面和所有默认 scanner capability 所需的 runtime、application code、backend、schema、manifest 和许可证材料。默认扫描 MUST NOT 要求用户预装 Node、Bun、Python、npm package 或全局 scanner。

#### Scenario: Clean machine 执行
- **WHEN** 用户在没有全局 Node、Bun、Python、scc、Lizard 或 jscpd 的受支持机器上解压 Vibe Check release
- **THEN** 产品可以使用随包组件启动默认扫描

### Requirement: Platform release manifest
便携目录 SHALL 包含 machine-readable manifest，记录产品版本、目标平台、control-plane build/runtime identity、内建 backend identity/version、semantic profile、关键文件位置和完整性材料。Runtime MUST 从该 manifest 或由其生成的固定布局解析产品组件。

#### Scenario: 检查发布组成
- **WHEN** 验证流程读取一个 Windows x64 release manifest
- **THEN** manifest 可以识别控制面、bundled Python/Lizard、scc、jscpd 和对应 semantic profiles

### Requirement: Offline production execution
正式扫描 SHALL 在无网络环境中运行，并 MUST NOT 在运行时下载 runtime、scanner、grammar、npm package 或 Python package。

#### Scenario: 网络不可用
- **WHEN** 受支持项目在网络被禁用的 clean environment 中扫描
- **THEN** Vibe Check 只使用便携目录和目标项目中的输入完成执行
- **AND**不会尝试下载缺失组件

### Requirement: Installation and project separation
Product installation SHALL 与 project input 和 writable runtime state 分离。扫描任意 project root 时，产品 MUST NOT 从目标项目解析自身 runtime/backend，也 MUST NOT 把 cache、artifact 或临时状态写入只读 install root。

#### Scenario: 从只读安装目录扫描外部项目
- **WHEN** Vibe Check 安装目录只读且 project root 位于其它路径
- **THEN** product control plane 和 backend 仍从安装目录加载
- **AND**可写状态进入明确的 cache、artifact 或 temporary location

### Requirement: Windows x64 vertical acceptance
第一条 portable distribution 验证 SHALL 生成 Windows x64 release，并在无全局 runtime/scanner、无网络且安装路径包含空格或 Unicode 的环境中完成真实 scan。该验证 MUST 记录产物大小、冷启动、扫描延迟和峰值内存，作为后续平台与 backend 选择的基线。

#### Scenario: Windows x64 portable spike
- **WHEN** CI 或受控测试机执行 Windows x64 portable acceptance
- **THEN** release 在 clean environment 完成端到端扫描
- **AND**验证记录 runtime closure、路径行为和资源测量结果
