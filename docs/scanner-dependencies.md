# Scanner 依赖选择

本文是 Vibe Check scanner 依赖选择的 owner 文档。它维护默认依赖基线，约束每个依赖的实现归属、adapter 边界、替换条件和验收要求。

本文只回答“scanner 默认使用哪些 Rust 可导入依赖，以及如何隔离它们”。指标语义、warning、gate、schema、示例和输出字段仍由各自 owner 定义。

## 实施状态

Rust CLI 已通过 exact `cpd-finder 0.1.8` dependency、Vibe Check-owned adapter 和
fixture-backed contract tests 实现本文的 duplicate scanner 基线。当前 binary 的实现证
据由 Cargo metadata、Rust adapter tests 和 CLI contract tests 持有；
`integrate-rust-jscpd-adapter` 继续记录本次接入的验收与归档状态。

Rust CLI 也已通过 exact `ast-grep-core 0.44.1` / `ast-grep-language 0.44.1` dependencies、
四语言最小 parser features、Vibe Check-owned structural adapter 和 fixture-backed contract
tests 实现本文的 structural scanner 基线。Cargo resolution、dependency characterization、
adapter / Core tests 和真实 CLI contract 持有实现证据；
`integrate-rust-ast-grep-structural-adapter` 记录本次接入的验收状态。

## 目标与范围

依赖基线必须满足三项要求：

1. 以 Rust crate 或 Rust 可导入库为默认集成方式。
2. 面向主流代码库，当前首批支持覆盖 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；JavaScript / JSX / TSX 属于后续支持范围。
3. 支持 scanner adapter 输出 Vibe Check 自己的归一化模型，而不是把第三方结构作为 public contract。

本文适用于新增、替换、降级或重新评估 scanner 依赖。实现某个具体指标、warning、gate、输出字段或 schema 时，进入对应 owner 文档。

## 默认基线

Scanner 默认使用以下依赖：

1. `ignore`：文件收集和 scan scope 基础能力。
2. `ast-grep-core` + `ast-grep-language`：多语言结构扫描基座。
3. `tokei`：LOC、注释行、空行和语言统计 adapter。
4. `cpd-finder = "=0.1.8"`：jscpd v5 Rust engine 的重复代码检测 adapter 入口。

实现 scanner 时以这些依赖作为基线。新增 feature 不重新发散依赖选择；如果编译、许可证、性能、API 稳定性或 fixture 证明某个依赖不可用，按“替换流程”处理。

## 依赖基线

| 依赖 | 实现归属 | 采用规则 |
| --- | --- | --- |
| `ignore` | 文件收集 / scan scope | 默认核心依赖 |
| `ast-grep-core` + `ast-grep-language` | Scanner adapter / structural scan | 默认结构扫描基座 |
| `tokei` | LOC metrics adapter | 默认 LOC adapter |
| `cpd-finder = "=0.1.8"` | Duplicate scanner adapter | 默认 duplicate scanner；升级或替换前必须重跑 dependency characterization |

使用约束：

1. `ignore` 负责递归遍历、`.gitignore`、include / exclude、hidden file 和路径过滤。不可读路径、walk error 和 ignore 解析错误必须映射为 Vibe Check 诊断。
2. `ast-grep-core` + `ast-grep-language` 负责多语言 AST / CST pattern、语言识别和 parser 接线。它不拥有质量指标、warning、gate 或输出字段语义。
3. `tokei` 负责文件数、代码行、注释行、空行和语言统计。`tokei` 的语言 taxonomy 和报告结构只作为 adapter 输入，不成为 machine output 契约。
4. `cpd-finder` 通过 jscpd v5 Rust engine 提供 pairwise duplicate clone 输入。Rust API、
   scope ownership、threshold 和 source-id 行为通过 checked-in fixture 后才能进入 Vibe
   Check model 与 runtime integration；characterization 未通过时停止接入并先修正 owner
   文档和 change artifacts。

## Structural scanner dependency contract

第一版 structural scanner dependency baseline 固定为：

| 项目 | 决策 |
| --- | --- |
| Cargo requirements | exact `ast-grep-core = "=0.44.1"`、`ast-grep-language = "=0.44.1"` |
| Language features | 关闭 `builtin-parser`；只启用 `tree-sitter-go`、`tree-sitter-python`、`tree-sitter-rust`、`tree-sitter-typescript` |
| Upstream MSRV / license | Rust `1.85` / MIT |
| Vibe Check toolchain | Rust `1.96.0`，独立于 dependency MSRV |
| Input ownership | normalized scan scope 提供的 exact `.ts` / `.go` / `.rs` / `.py` paths |

当前 lockfile 解析 `tree-sitter 0.26.10`、Go `0.25.0`、Python `0.25.0`、Rust
`0.24.2` 和 TypeScript `0.23.2` grammar；没有启用其它语言 parser。Grammar 与
tree-sitter patch 升级也必须视为 characterization 触发条件，不能只检查两个 direct crate
versions。

长期 dependency contract 由本节持有；exact source facts 与实施审计由 OpenSpec change
`integrate-rust-ast-grep-structural-adapter` 的 `source-audit.md` 持有，并在归档后随该
change 作为历史证据保留。Adapter 只使用经审计的 `AstGrep` / `StrDoc` parse boundary、
`SupportLang` 四语言映射，以及 `Node` 的 DFS、field、kind、text、range、position、named、
error / missing inspection。第三方 node、language enum、native error、pattern 或 raw tree
不进入 Core、Output、schema 或 examples。

第一版支持有 executable body 且可稳定命名的形态：TypeScript named function、method、
constructor 和 direct identifier-bound arrow / function expression；Go function / method；
Rust free / nested function、impl method 和 trait default method；Python sync / async free、
nested 和 class method。Signature-only / abstract / no-body forms 与无 stable declaration / direct
binding 的 anonymous callbacks 不产生 metric，也不产生 diagnostic。

Go / TypeScript parameter traversal 只计算 audit 列出的 parameter node kinds。这两种语言的
parameter-list `comment` 是 named syntax extra，和 unnamed punctuation 一样计数为零，且不
产生 diagnostic 或 fatal；其它未经审计的 named child 表示对应 grammar mapping invariant
失效，映射为 scanner fatal。

Adapter 不扫描 project root、不重新应用 ignore rules，也不接收 argv、config path、raw
include / exclude 或 threshold override。它逐个读取 exact supported file，严格 UTF-8 decode，
每个文件只 parse / traverse 一次。Syntax recovery tree 中出现 `ERROR` 或 missing node、文件
不存在、非 regular file、不可读或非 UTF-8 时，跳过该文件全部 structural metrics并返回
warning-severity `STRUCTURAL_SCAN_PARTIAL`；即使全部 structural inputs 被跳过，只要其它
report data可信，仍返回 partial report。初始化、panic、language mapping、path / range或
identity invariant失败是 scanner fatal。

Checked-in、hand-written、offline fixtures 已直接调用 dependency public API，证明四语言
node / field mapping、稳定名称、body presence、1-based inclusive range、receiver 排除、
compound parameter slot、Go / TypeScript named comment extra、syntax error / missing-node检测
和 UTF-8 behavior。Exact dependency 或 grammar 升级必须重新运行完整 characterization；
失败时先修正 source audit 和 change artifacts，不增加 adapter workaround。

### Structural scan performance evidence

2026-07-11 在 Windows、Rust `1.96.0`、release profile 下比较接入前的 `5d97352` binary 与
当前实现。两者均先预热，随后用 PowerShell `Measure-Command` 运行完整
`vibe-check scan <fixture> --format json`，stdout 丢弃，编译时间不计入结果：

| Checked-in input | Repetitions | Before average | After average | Difference |
| --- | ---: | ---: | ---: | ---: |
| `mixed-scope-boundaries` | 30 | 35.34 ms | 35.83 ms | +0.49 ms / +1.4% |
| `tests/fixtures/projects` 全集 | 20 | 102.69 ms | 109.16 ms | +6.48 ms / +6.3% |

两组对比都扫描工作树中的同一绝对 fixture path，避免 baseline 临时目录位置影响结果。
Adapter 的 per-file loop 对成功输入调用一次 `AstGrep::try_new`，再执行一次 root DFS 收集
candidates；per-language normalization 只消费该 candidate list。当前证据未显示需要 cache 或
并行 scheduler；依赖或 grammar 升级、supported language 扩展，或代表性扫描耗时出现明显
回归时重新测量并评估。

## Duplicate scanner dependency contract

第一版 duplicate scanner 依赖基线固定为：

| 项目 | 决策 |
| --- | --- |
| Cargo requirement | exact `cpd-finder = "=0.1.8"` |
| Rust API | `cpd_finder::orchestrate::{RunConfig, run}` |
| Upstream MSRV | Rust `1.87` |
| Vibe Check toolchain | Rust `1.96.0`，独立于 dependency MSRV |
| License | MIT |
| Result semantics | 每个 upstream clone 是一个 pair，不是 N-location group |

`cpd-core` 和 `cpd-tokenizer` 默认只作为 transitive dependencies。只有 adapter 必须在公开
签名中命名其类型时才允许新增 direct dependency，并且必须在本节记录原因；Core 不得依
赖这些 upstream types。`cpd-reporter` 不进入第一版依赖图，raw reporter output 也不成
为稳定输出字段。

实施期 API authority 是
`openspec/changes/integrate-rust-jscpd-adapter/source-audit.md`。Cargo resolution、下载到本
地的 crate source、编译结果或 fixture 行为只要与该 snapshot 冲突，就必须先更新 source
audit、design 和受影响 spec，再继续实现；不能用 adapter workaround 隐藏冲突。

在新增 Vibe Check duplicate model、adapter 或 runtime integration 前，必须用直接调用
`cpd_finder` 的 checked-in fixtures 证明：

- individual exact file paths 可以产生 cross-file 和 same-file pairs，不需要传 project
  root；
- `.ts`、`.go`、`.rs`、`.py` 与 upstream formats 的映射成立；
- `min_tokens = 50`、`min_lines = 5` 的真实边界与 source audit 一致；
- `no_gitignore = true` 不会对 Vibe Check 已批准的 exact paths 二次应用 gitignore；
- canonical source ids 能稳定映射回输入文件。

该 characterization gate 只验证 dependency 事实，不拥有 Vibe Check warning、gate 或诊
断语义。

## Adapter 边界

Scanner adapter 必须把第三方结果归一化为 Vibe Check 模型。允许跨 adapter 边界传递的模型包括：

- `FileMetrics`：文件路径、语言、lines、code、comments、blanks 和来源信息。
- `FunctionMetric`：函数 / 方法类别、稳定名称、位置和参数数量。
- `DuplicateFinding`：稳定 pair identity、两个归一化片段位置、line / column spans 和
  token count。
- `ScannerDiagnostic`：scanner identity、版本、输入范围、跳过原因、部分失败、fatal 失败和原始摘要位置。

第三方 AST、语言枚举、原始 JSON、私有错误类型和内部配置只允许停留在 adapter 内部。Core、Output、schema 和测试 fixture 只依赖 Vibe Check 类型、稳定字段和明确错误分类。

## 替换流程

满足任一条件时，可以替换或降级依赖：

1. 依赖无法在目标平台或发布链路可靠编译。
2. 许可证、MSRV、native build、依赖体积或安全审计风险不可接受。
3. API 或输出在小版本内频繁破坏，导致 adapter 维护成本过高。
4. fixture 证明其语言覆盖、位置映射、指标语义或重复检测结果不满足 Vibe Check 契约。
5. 出现更小、更稳定或更适合多语言质量扫描的 Rust 可导入替代库。

替换必须按以下顺序执行：

1. 记录触发原因、影响范围、候选替代方案和保留现状的风险。
2. 证明新方案能保持 adapter contract，或明确需要同步哪些 Vibe Check 模型。
3. 更新本文档、adapter tests、schema examples 和 release notes。
4. 在最终说明中列出验证命令、fixture 覆盖和残余风险。

## 验证要求

首次接入或替换这些依赖时，最低验证包括：

1. 覆盖首批 supported source set：TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py` 的 fixture；JavaScript / JSX / TSX fixture 只在后续支持 change 中作为 supported dependency coverage 引入。
2. 文件收集 fixture：include / exclude、`.gitignore`、hidden file、generated / vendor path。
3. LOC fixture：code、comments、blanks、empty file、mixed newline 和 unsupported file。
4. 结构扫描 fixture：函数 / 方法定位、嵌套结构、语法错误文件、UTF-8 路径。
5. 重复检测 fixture：individual-file input、跨文件 pair、同文件 pair、`50` token / `5`
   line-span 阈值、gitignore ownership、generated / vendor 排除和 canonical source id。
6. 诊断 fixture：工具跳过、部分失败、解析失败、fatal 失败和 raw summary 位置。
