# 架构

本文是 Vibe Check 组件职责、输出分层、scanner 边界和运行边界的主规范。

## 核心定位

Vibe Check 是 Rust-first 的代码质量检测 CLI。`vibe-check` 是核心 CLI，负责命令类型识别、配置入口、项目路径归一化、输出模式、顶层诊断和退出码映射。扫描编排由 core scan pipeline 拥有，负责从已归一化输入生成扫描计划、调用 scanner、聚合指标、生成 warning、计算 gate 结果并交给输出层。

核心流程：

```text
collect -> scan -> aggregate -> warn -> report -> gate
```

`project root` 定位被扫描项目；`scan scope` 表示 include/exclude/generated 规则解析后的文件集合；`scanner result` 表示检测能力的归一化输出；`quality snapshot` 表示指标、聚合、warning 和 gate 的业务结果。CLI 不解析 scanner 私有输出；Output 不重新计算指标；Scanner 不拥有 warning policy 或 gate policy。

## 输出分层

Vibe Check 扫描结果分为四类输出：

| 输出 | 目标 | Owner |
| --- | --- | --- |
| 人读摘要 | 本地定位、审查和快速判断 | Output |
| 机器结果 | CI、脚本、schema 校验和长期兼容 | Output |
| CI 投影 | summary、annotation 和 gate 展示 | Output |
| scanner 原始摘要 | 复现 adapter 解析问题和工具诊断 | Scanner |

这些输出复用相同业务语义，例如文件、指标、warning、accepted warning 和 gate 结果，但使用不同包装和稳定性承诺。扫描管线不按输出模式分叉；Core 产出业务结果和诊断，Output 按输出模式投影到 stdout、stderr 和 artifact。

需要机器稳定解析、兼容校验或自动化断言时，调用 machine output。默认 CLI 输出优先服务阅读体验。scanner 原始摘要只用于诊断和复现，不是业务 schema 的 owner。

## 组件职责

### `vibe-check`

负责：

- 提供稳定 CLI 入口和命令分流。
- 解析 argv、help/version、配置入口、项目路径和输出模式。
- 将用户输入归一化为 core scan request。
- 调用 core scan pipeline 并接收 scan outcome。
- 将 core error、output error 和 gate result 映射为退出码。
- 维护 stdout/stderr 通道边界和顶层诊断投影。

`vibe-check` 不拥有指标语义、scanner adapter、warning 规则、machine output 字段或报告结构。

### Core scan pipeline

负责：

- 合并配置并构造 scan scope。
- 解析 include/exclude/generated 规则并生成文件集合。
- 构造 scanner registry 和 scan plan。
- 调用 scanner adapter 并收集归一化 scanner result。
- 建立文件级、函数级和聚合指标模型。
- 根据指标、阈值、scope 和 accepted warning 规则生成 warning。
- 根据 warning 和 gate policy 生成 gate result。
- 生成供 Output 消费的 report data。

Core scan pipeline 不解析 CLI argv，不写 stdout/stderr，不拥有具体报告排版，也不保存 scanner 私有原始格式作为稳定输出。

### Scanner adapter

负责：

- 使用内置实现、嵌入式 Rust 库或外部工具提供检测能力；默认依赖选择由 [Scanner 依赖选择](scanner-dependencies.md) 维护。
- 声明 scanner identity、能力范围、输入要求和版本信息。
- 将检测结果归一化为 Core 可消费的 scanner result。
- 区分成功、无发现、跳过、部分失败和 fatal 失败。
- 保存复现解析问题所需的原始摘要或诊断。

Scanner adapter 只处理检测能力和结果归一化，不承担 warning policy、gate policy、输出模式、退出码或项目配置命令。

### Output

负责：

- 将 report data 投影为人读摘要、机器结果、CI 摘要和 annotation。
- 维护机器结果的 envelope、schema、example 和兼容性。
- 维护人读输出的 section、label、排序和 empty state。
- 维护 artifact 写入、stdout/stderr placement 和 output error 映射。
- 保持 machine output、human output 和 CI output 的业务语义一致。

Output 不拥有 scanner 解析、指标计算、warning 生成或 gate 判定。

### 共享模块

共享模块只抽取稳定契约、机械流程和跨组件重复实现。共享 owner：

- `config`：配置数据结构、默认值、配置合并和配置诊断。
- `files`：scan scope、路径归一化、文件分类和 generated file 判定。
- `model`：quality snapshot、metric、warning、gate 和 report data 的领域类型。
- `scanner`：scanner trait、adapter registry、scanner result 和 scanner diagnostics。
- `warning`：warning rule、accepted warning 匹配和 warning ordering。
- `gate`：gate policy、gate result 和 blocking 计算。
- `output`：human/machine/CI output projection 和 artifact 写入。
- `error`：跨 owner error category、diagnostic record 和 CLI 映射材料。

除上述 owner 明确承接的职责外，共享模块不定义 CLI 参数、scanner 私有语义、输出字段形状、schema 示例、项目配置命令或测试 case 归属。新增共享模块或调整共享边界时，必须同步 owner 文档和验证材料。

## 调用链

通用调用链：

```text
caller
  -> vibe-check：解析命令类型、配置入口、项目路径、输出模式和顶层诊断上下文
  -> core scan pipeline：加载配置、构造 scan scope、生成 scan plan
  -> scanner adapter registry：选择并调用 scanner adapter
  -> selected scanner adapter：执行检测、归一化结果、返回 scanner diagnostics
  <- core scan pipeline：聚合指标、生成 warning、计算 gate、构造 report data
  <- output layer：投影为人读输出、机器输出、CI 输出和 artifact
  <- vibe-check：写入 stdout/stderr 并映射退出码
```

调用链保持单一业务路径。输出模式只影响投影方式，不改变扫描、聚合、warning 或 gate 的业务结果。

## 运行边界

- 默认扫描通过 core release 编译进来的 scanner adapter registry 执行。
- Scanner adapter 返回归一化结果、scanner diagnostics 或 scanner error；stdout/stderr、退出码和输出包装由 CLI / Output owner 处理。
- 嵌入式 Rust 库是默认检测集成方式；外部工具必须通过 scanner adapter 隔离进程、版本、退出状态和原始摘要。
- Scanner 依赖基线由 [Scanner 依赖选择](scanner-dependencies.md) 拥有；架构层只要求依赖通过 scanner adapter 输出归一化结果和诊断。
- 配置错误、输入错误、scanner fatal、output failure 和 gate failure 使用不同 error category。
- Machine output 用于自动化消费和兼容验证；human output 用于阅读和定位。
