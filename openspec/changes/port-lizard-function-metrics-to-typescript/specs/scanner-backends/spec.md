本 delta 将 function-metrics backend 从 Python/Lizard 外部组件替换为逐文件翻译的仓库内 TypeScript 模块。

## ADDED Requirements

### Requirement: Lizard TypeScript source mapping
Repository SHALL 以 terryyin/lizard 1.23.0、commit 06284ec87c1966fee4ddbf3f068ccf89b987b0f8 为第一版翻译基线。每个迁入的上游 Python 文件 MUST 对应一个主要 TypeScript 文件，并记录 upstream path、revision、适用 license、translated tests 和有意 adaptation。

第一版范围 MUST 覆盖产品所需的 lizard.py、code_reader.py、clike.py、golike.py、script_language.py、js_style_regex_expression.py、TypeScript/Go/Rust/Python readers 和 language registry。新增依赖文件 MUST 先进入 source map。

#### Scenario: 逐文件翻译可追溯
- **WHEN** reviewer 检查任一 Lizard port module
- **THEN** source map 能定位其上游文件、固定 revision、适用 license 和对应测试
- **AND** 未记录的上游源码不进入 TypeScript port

#### Scenario: 上游基线升级
- **WHEN** TypeScript port 准备采用不同 Lizard revision
- **THEN** source map、translated tests 和 scanner identity 同步更新
- **AND** 四语言对照验证重新执行

### Requirement: Python-free function metrics runtime
正式 product entry、production imports、dependency check、required validation 和 release artifact SHALL 直接使用仓库内 TypeScript function-metrics 模块，MUST NOT 解析或执行 Python、Lizard package、Lizard CLI 或 CSV protocol。固定 Python/Lizard MAY 仅用于显式迁移对照，不得成为 required validation 依赖。

#### Scenario: 默认扫描没有 Python
- **WHEN** 运行环境提供 Bun 但没有 Python 或 Lizard package
- **THEN** TypeScript、Go、Rust 和 Python source 的 function-metrics scan 正常执行
- **AND** 扫描过程不启动 Python/Lizard 子进程

#### Scenario: Required validation 没有 Python
- **WHEN** 开发者运行 required validation
- **THEN** tests 使用 checked-in source、expectations 和 TypeScript port
- **AND** 不调用迁移期 Python/Lizard oracle

### Requirement: Fixed product scanner stack
TS/Bun 产品 SHALL 使用固定 scanner stack：scc 提供 LOC/file metrics，仓库内 Lizard-compatible TypeScript 模块提供 function metrics，jscpd 提供 duplicate detection。Typed product tool config MUST 为 external scc/jscpd 声明 command、受支持版本、固定参数、resolution strategy 和 protocol；function-metrics implementation MUST 来自当前 Vibe Check revision。

#### Scenario: 默认扫描使用固定组件
- **WHEN** product core 规划一次完整扫描
- **THEN** LOC 调用 scc，function metrics 直接调用仓库内 TypeScript 模块，duplicate detection 调用 jscpd
- **AND** 每项 capability 只有一个 production component mapping

### Requirement: Product-owned scanner adapter boundary
每项 scanner capability SHALL 通过 Vibe Check-owned adapter 接收 normalized input，并返回 Vibe Check-owned result、diagnostic 或 failure。Component 的原生类型、私有 output、process protocol 和实现语言 MUST 停留在 adapter boundary 内。

#### Scenario: 固定组件返回统一结果
- **WHEN** product core 调用 scc、TypeScript function-metrics port 或 jscpd
- **THEN** product core 只接收对应 capability 的 Vibe Check-owned normalized result
- **AND** warning、gate 与 stable report 不依赖 component-private type

### Requirement: Repository-owned component resolution
Product execution SHALL 从 repo-owned typed tool config 解析并验证 external scc/jscpd。Function-metrics SHALL 通过当前 Vibe Check module graph 直接加载固定 TypeScript source，不得由 PATH、Python environment、目标项目 package metadata 或 executable override 替换。组件缺失、版本不兼容或内部 module identity 无效 MUST 在扫描前产生 fatal diagnostic 或阻止交付验证。

#### Scenario: 目标机器存在同名 Lizard
- **WHEN** PATH 或目标项目提供不同版本的 Python/Lizard
- **THEN** function metrics 仍使用当前 Vibe Check revision 的 TypeScript port
- **AND** 外部 Lizard 不改变扫描结果

#### Scenario: 固定组件无效
- **WHEN** scc/jscpd 无法解析，或 TypeScript function-metrics module identity 无效
- **THEN** product control plane 返回 scanner fatal diagnostic 或 validation failure
- **AND** scan 不产生看似成功的空结果

### Requirement: Fixed-stack failure semantics
固定 scanner component 的 availability、identity、execution 和 normalization failures SHALL 映射到 product-owned diagnostic categories。Product execution MUST NOT 把缺失组件、TypeScript port exception、invalid result 或 normalization failure 投影为 zero metrics、zero duplicates 或 clean scan。

#### Scenario: jscpd 无法启动
- **WHEN** typed tool config 解析的 jscpd entry 无法启动
- **THEN** duplicate capability 返回 product-owned fatal failure
- **AND** report 不把 duplicate count 表达为可信的 zero

#### Scenario: TypeScript function result 无法信任
- **WHEN** function-metrics port 初始化失败、抛出未声明异常或返回 invalid facts
- **THEN** adapter 返回明确 scanner fatal failure
- **AND** partial facts 不被当成完整 function set

### Requirement: Internal extension boundary
Scanner adapter contract SHALL 只作为 Vibe Check 内部模块边界，不构成第三方 plugin API、npm package contract 或跨仓稳定 SDK。

#### Scenario: 固定组件实现升级
- **WHEN** Vibe Check 升级 scc、TypeScript Lizard port 或 jscpd integration
- **THEN** internal adapter API 可以随 product modules 一起调整
- **AND** product-owned result、diagnostic 和 owner tests 继续满足对应 capability
