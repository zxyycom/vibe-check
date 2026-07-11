本 delta 定义 Rust structural scanner 的目标契约；当前只在已完成阻塞级实现前审计的 change 目录中形成临时变更计划。该 capability 尚未归档建立，本 delta 不表示现有主规范或当前 binary 已具备 structural scanning。

## ADDED Requirements

### Requirement: Structural scanner adapter input
Core scan pipeline SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。structural scanner adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 Rust CLI 判定为 unsupported 的文件。第一版 structural inputs MUST 只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；`.d.ts` MUST 按 TypeScript supported input 处理。

#### Scenario: 接收 exact supported file paths
- **WHEN** scan scope 包含 supported files `src/app.ts` 和 `src/lib.rs`
- **THEN** structural scanner adapter 接收这两个 exact supported file paths
- **AND** adapter 不通过 project root 重新发现输入

#### Scenario: 不接收 unsupported 或 excluded files
- **WHEN** scan scope 包含 supported file `src/app.ts`、unsupported ordinary file `src/view.tsx`，且 `generated/schema.ts` 已被 scope rules 排除
- **THEN** structural scanner adapter 只接收 `src/app.ts`
- **AND** `src/view.tsx` 与 `generated/schema.ts` 不进入 structural scanner input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** runtime 跳过 structural scanner adapter
- **AND** scan 正常完成，不产生 function warning 或 structural diagnostic

### Requirement: ast-grep Rust integration boundary
Structural scanner adapter SHALL 通过经 source audit 和 characterization 验证的 `ast-grep-core` / `ast-grep-language` Rust API 解析 supported inputs。adapter MUST 将 ast-grep nodes、language enums、pattern objects、parser internals 和 native errors 限制在 adapter boundary 内，并 MUST 向 Core 返回 Vibe Check-owned structural results、diagnostics 或 normalized failure。

#### Scenario: Parser result 被归一化
- **WHEN** ast-grep parser 在 supported file 中定位到受支持的函数形态
- **THEN** Core 接收 Vibe Check `FunctionMetric`
- **AND** Core 不依赖 ast-grep native node 或 language type

#### Scenario: 第三方语法树不进入稳定输出
- **WHEN** adapter 使用 ast-grep syntax tree 或 debug representation 定位解析问题
- **THEN** raw syntax tree 与 parser debug output 不进入 report schema 或 human output contract

### Requirement: Normalized stable-named function metrics
Structural scanner results SHALL 在 warning generation 前归一化为 Vibe Check-owned `FunctionMetric` records。每条 record MUST 包含 project-root-relative `/` path、stable lowercase language、kind、display name、1-based inclusive source range 和 normalized parameter count。第一版 kind MUST 为 `function`、`method` 或 `constructor`。

第一版 MUST 包含有 executable body 且能从 declaration、method、constructor 或 direct binding 得到稳定名称的函数形态：TypeScript named function declarations、methods、constructors 和直接绑定到 identifier 的 arrow / function expressions；Go functions 与 methods；Rust free / nested functions、impl methods 和带 body 的 trait default methods；Python sync / async free functions、nested functions 与 class methods。Signature-only declarations、无 body 的 abstract / trait declarations，以及没有稳定 declaration 或 binding name 的 anonymous closures / callbacks MUST NOT 产生 `FunctionMetric`。

#### Scenario: 四种 supported language 产生 normalized metrics
- **WHEN** TypeScript、Go、Rust 和 Python supported fixtures 分别包含有 executable body 的 named function 或 method
- **THEN** adapter 为每个受支持形态返回包含 normalized path、language、kind、name、range 和 parameter count 的 `FunctionMetric`

#### Scenario: 稳定绑定的 TypeScript arrow function 被纳入
- **WHEN** TypeScript source 将 arrow function 直接绑定到 identifier `buildReport`
- **THEN** adapter 返回 display name 为 `buildReport`、kind 为 `function` 的 normalized metric

#### Scenario: Declaration-only function 不产生 metric
- **WHEN** `.d.ts`、TypeScript abstract member 或 Rust trait signature 声明函数但没有 executable body
- **THEN** adapter 不为该 declaration 产生 `FunctionMetric`
- **AND** 该状态不产生 structural diagnostic

#### Scenario: 匿名 callback 不产生 metric
- **WHEN** supported source 包含无法从 declaration 或 direct binding 得到稳定名称的 anonymous callback 或 closure
- **THEN** adapter 不为该 callback 或 closure 产生 `FunctionMetric`

### Requirement: Cross-language parameter count semantics
`FunctionMetric.parameter_count` SHALL 表示调用者显式传入的 parameter slots。Go method receiver、Rust self receiver、TypeScript `this` pseudo-parameter，以及 Python non-static class method 的第一个 receiver parameter MUST NOT 计入。Python `@staticmethod` parameters MUST 全部按普通 explicit parameters 计数。Default、optional、destructured、rest 和 variadic parameter forms MUST 各按一个 parameter slot 计数。

#### Scenario: Language receiver 不计入参数数量
- **WHEN** Go method、Rust method、TypeScript method 或 Python non-static class method 各声明一个 receiver 和四个 explicit parameters
- **THEN** 每条 normalized metric 的 `parameter_count` 为 `4`

#### Scenario: Python static method 没有隐式 receiver
- **WHEN** Python `@staticmethod` 声明五个 parameters
- **THEN** normalized metric 的 `parameter_count` 为 `5`

#### Scenario: 复合 parameter form 按槽计数
- **WHEN** supported function 包含 default、optional、destructured、rest 或 variadic parameter
- **THEN** 每个 source-level parameter slot 对 `parameter_count` 贡献 `1`
- **AND** binding 内部包含的名字数量不增加 parameter count

### Requirement: Structural result ordering remains deterministic
Structural scanner adapter SHALL 使用 normalized source identity 输出确定性结果。`FunctionMetric` MUST 按 `(file, start line, start column, end line, end column, kind, display name)` 排序；相同源码、相同 scan scope 和相同内置 profile MUST 产生相同 function metric 数量、内容和顺序。

#### Scenario: 重复扫描保持结构结果一致
- **WHEN** 同一个 project 在源码和 scan scope 未变化时被重复扫描
- **THEN** adapter 返回相同的 normalized function metrics
- **AND** function metrics 的顺序保持一致

#### Scenario: 同一行多个稳定函数按 source range 排序
- **WHEN** 一个 supported file 在同一行包含多个可稳定命名的 function forms
- **THEN** adapter 使用 start / end column 和 normalized identity 产生确定顺序

### Requirement: Structural scanner diagnostics
Structural scanner problems SHALL 显式可见。单文件不存在、不是 regular file、不可读、不是 UTF-8 或包含 parser error / missing node 时，adapter MUST 跳过该文件的全部 function metrics，并为该文件产生 warning-severity `STRUCTURAL_SCAN_PARTIAL` diagnostic；scan report MUST 标记为 `partial`。即使所有 structural inputs 都因这些文件级问题被跳过，只要其它 scanner report data 仍可信，scan MUST 返回带 diagnostics 的 partial report。

Adapter 初始化失败、panic unwind、supported language mapping 缺失、project root 外 path、无效 source range 或 normalization invariant failure MUST 映射为 scanner fatal error，MUST NOT 转换成 empty structural result。

#### Scenario: 单文件 parse error 产生 partial report
- **WHEN** 一个 supported file 包含 parser error node，且 scan pipeline 仍能产生其它可信 report data
- **THEN** adapter 不返回该文件的 function metrics
- **AND** report 包含该文件的 `STRUCTURAL_SCAN_PARTIAL` diagnostic
- **AND** `summary.status` 为 `partial`

#### Scenario: 所有 structural inputs 都发生文件级问题
- **WHEN** scan scope 包含 supported files，但每个 structural input 都因读取、UTF-8 或 parse 问题被跳过
- **THEN** scan 返回带对应 `STRUCTURAL_SCAN_PARTIAL` diagnostics 的 partial report
- **AND** structural failure 不表现为 clean completed report

#### Scenario: Adapter result 无法信任时 fatal
- **WHEN** adapter initialization、panic、language mapping、path normalization 或 source range invariant 失效
- **THEN** CLI 以 scanner fatal exit code `3` 退出
- **AND** stdout 不包含 human 或 JSON scan report
