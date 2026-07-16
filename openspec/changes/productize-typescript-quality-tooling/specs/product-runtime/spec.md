本 capability 将现有完整 TypeScript quality tooling 确立为 Vibe Check 产品 core，并定义其正式入口、源码所有权、模块边界、验证和单一执行路径。

## ADDED Requirements

### Requirement: Existing TypeScript engine becomes the product core
Vibe Check 产品 SHALL 以现有 TypeScript quality engine 作为正式 product core。TS/Bun control plane MUST 承担 invocation、scan planning、code-area classification、baseline/cache、metrics aggregation、warning、accepted-warning handling、gate、diagnostics 和 report/artifact projection；这些能力只有这一处产品实现与业务 owner。

#### Scenario: 正式调用进入现有产品核心
- **WHEN** 用户通过默认 Vibe Check 入口启动质量扫描
- **THEN** invocation 进入迁入后的 TS/Bun product core
- **AND** scan planning、warning、gate 和 report data 由该 core 完成

### Requirement: Source transfer preserves complete engine behavior
源码收归 SHALL 以产品化前回归基线固定现有 quality engine 的完整行为。每个迁入 slice MUST 保持 scan planning、code areas、baseline/cache、scc/Lizard/jscpd parsing、metrics、warnings、accepted warnings、gate 和 report/artifact behavior；产品接线 MAY 按 CLI/output owner 投影外部 contract，但 MUST 保留完整 engine capability。

#### Scenario: 迁入 source closure 后行为不退化
- **WHEN** `quality-core` 与 runtime helpers 从固定 gitlink revision 迁入 Vibe Check-owned modules
- **THEN** 同一 config、inputs、tool outputs 和 options 产生与产品化前基线一致的 normalized engine results
- **AND** 差异必须在继续迁入前被解释并修复

#### Scenario: Product projection 不删减 engine capability
- **WHEN** 正式 output 只投影 output owner 已定义的字段
- **THEN** baseline/cache、code-area、accepted-warning 和额外 artifact 能力仍由 product core 保留
- **AND** 回归 suite 独立证明这些能力不因 output projection 丢失

### Requirement: Modular monolith ownership
Vibe Check SHALL 作为单仓模块化单体拥有正式 local CLI、product core、scanner adapters、domain model、toolchain config 和验证入口。内部模块 MAY 按职责分区，但 product execution MUST NOT 要求跨产品仓库、独立 source revision 或网络服务。

#### Scenario: 内部模块共同执行
- **WHEN** 开发者从 Vibe Check 仓库运行正式 product CLI
- **THEN** entry、product core 和内建 scanner adapters 来自同一 Vibe Check revision
- **AND** 执行不依赖 Docnav 或共享 infrastructure 仓库的同步 checkout

### Requirement: Self-contained product source
Product runtime 使用的 quality engine 与 helper source closure SHALL 由 Vibe Check 仓库直接拥有。一次性迁入 MUST 记录来源 revision 和适用许可证；迁入完成后 production build MUST NOT 要求初始化对应 git submodule 或从其它仓库 import source。

#### Scenario: 新 checkout 构建产品
- **WHEN** 开发者获取 Vibe Check 主仓库并按 product build 说明准备依赖
- **THEN** 仓库已包含构建正式 TS/Bun entry 所需的 product source
- **AND** build 不要求初始化旧 product-runtime gitlinks

#### Scenario: Development-only gitlink 不进入 runtime closure
- **WHEN** 某个 toolkit submodule 仍只服务 workspace verifier 或 docs validator
- **THEN** production module graph 与正式 product command 不包含该 gitlink
- **AND** 该 submodule 的维护由其现有 development owner 继续承担

### Requirement: Product and development dependency direction
仓库开发脚本、workspace verifier 和 dogfooding automation MAY 调用正式 product API 或 CLI；product core MUST NOT 导入只服务仓库维护的 validators 或 verification definitions。Vibe Check 仓库专用 include/exclude、code areas 和 accepted warnings SHALL 保持 consumer-owned config。

#### Scenario: 开发验证复用产品实现
- **WHEN** workspace quality check 执行与正式产品相同的扫描能力
- **THEN** 开发入口调用 product core 或正式 CLI
- **AND** product core 不依赖 workspace verifier 才能运行

#### Scenario: Repository config 保持在 consumer
- **WHEN** Vibe Check dogfooding 配置声明仓库专用 code areas 或 accepted warnings
- **THEN** config 通过 typed product boundary 传入
- **AND** 这些仓库事实不成为通用 product defaults

### Requirement: Single repository product execution path
仓库默认 product entry SHALL 在源码收归、回归 suite、owner contract tests、固定依赖检查和本地验收全部通过后使用 TS/Bun product core。完成切换后，正式 CLI、dogfooding scripts 和 workspace quality commands MUST 共用这一条 product execution path。

#### Scenario: Product acceptance 完成
- **WHEN** 当前开发环境通过全部 product-runtime 与 local acceptance
- **THEN** 默认 product entry 启动 TS/Bun product core
- **AND** 正式仓库命令与 dogfooding 使用同一 product implementation

#### Scenario: 验收失败由当前实现修复
- **WHEN** TS/Bun productization 在 source ownership、contract projection、dependency resolution 或 local execution 上失败
- **THEN** 默认入口切换保持未完成状态
- **AND** implementation 修复后重新运行同一 acceptance

### Requirement: Local product verification
Vibe Check SHALL 提供 repo-owned validation command，在当前开发环境验证正式 local CLI、固定 scanner stack、human/JSON output、diagnostics 和 state boundaries。Path/process tests MUST 使用 platform-neutral runtime APIs 与 checked-in lexical inputs 覆盖路径分隔、空格、Unicode、引号、cwd 和 executable naming。

#### Scenario: 当前开发环境完成端到端验收
- **WHEN** 开发者运行 product validation command
- **THEN** command 在当前开发环境通过正式 local CLI 完成真实 human 与 JSON scans
- **AND** 结果满足产品化前回归基线与 CLI/output owner contracts

#### Scenario: Path 与 process 边界可重放
- **WHEN** validation suite 检查 path normalization、structured process arguments、cwd、spaces、Unicode、quotes 或 executable naming
- **THEN** checked-in fixtures 同时覆盖 POSIX 与 Windows lexical forms
- **AND** validation scripts 通过 runtime API 构造 path 与 process invocation
