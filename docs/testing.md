# 测试策略

本文定义 Vibe Check 自动化测试的层级、所有权、统一验证入口和一致性审计规则。以下子
文档维护测试用例流程和最终账本：

- [测试用例维护](testing/case-maintenance.md)：测试函数、fixture 证明目标和源码
  `@case` 标记变更时的维护流程。
- [测试用例编号账本](testing/cases.md)：最终 case 条目、证明目标和源码 `@case` 标记映
  射。

稳定 CLI 行为、退出码、输出字段、schema 形状、scan scope、指标、warning 和 gate 语
义以 [文档导航](navigation.md#规则所有权) 指向的 owner 文档为准；测试文档只记录覆盖
目标、测试归属和验收边界。

## 测试层级

| 层级 | 核心目标 |
| --- | --- |
| 文档 / schema | Markdown 链接、JSON 语法、report schema 编译和 report examples 校验；schema 和 examples 是输出契约验证材料，不重新定义产品语义 |
| Rust 单元 | CLI parser、scan scope、指标聚合、warning / gate、runtime 错误映射、输出 helper 和其它自定义逻辑不变量 |
| Rust 集成 | 通过真实 `vibe-check` binary 验证 CLI 参数、路径、配置、stdout/stderr、退出码、人读输出和 JSON report schema |
| 脚本 / toolkit | TypeScript 脚本类型、lint、quality tooling、workspace verifier 和共享 toolkit 的本地工具边界 |
| 综合验证 | required / full profile 串联文档、脚本、quality、Cargo、OpenSpec 和 toolkit gate，证明交付边界没有漂移 |

## 测试所有权

测试按“用户可观察契约”和“自定义逻辑不变量”划分所有权。同一行为只有在证明不同责任时
才跨层测试：Rust 单元测试证明内部不变量，Rust 集成测试和验证脚本证明真实入口的外部
契约。

历史回归只作为风险线索或代表性输入来源，不作为证明目标。新增测试、拆分测试或向已有
测试添加断言前，先能写出“owner 明确承诺的语义 -> 可观察结果”的证明目标，并能追溯到
当前 owner 文档、schema、示例或相邻实现边界；涉及稳定 case 的改动按
[测试用例维护](testing/case-maintenance.md) 更新账本和 `@case` 标记。只有当 owner 明
文要求校验缺失、拒绝、输出通道不污染、路径不变更或其它否定性边界时，才测试该否定行
为；否则使用现有覆盖、局部验证命令或代码审查证明本次改动。

### CLI contract

CLI contract 测试从发布给用户的可执行入口验证外部契约。覆盖范围按以下维度评估：

- `scan` 的代表性成功路径和失败路径。
- project root 默认值、显式路径、leading-dash 路径、config path 和路径规范化。
- `human` 与 `json` 输出模式，以及 JSON 输出对
  [report schema](schemas/vibe-check-report.schema.json) 的校验。
- 退出码、`stdout`、`stderr` 及其相互约束。
- scan scope 的 include / exclude、supported file 分类和 collection diagnostic。
- 指标聚合、warning records、blocking gate 和 partial report 的可观察结果。
- help / version 不启动扫描，也不输出 report。

同一校验规则下的多个同类非法值视为一个等价类，只选择能证明外部行为的用例。覆盖完整
性由契约维度判断，不以代码覆盖率或参数组合数量衡量。

### Rust tests

Rust tests 负责具有独立出错空间的自定义逻辑。每个用例应明确证明一个分支、状态转换、
算法边界或数据不变量，例如：

- CLI token 消费边界、format 枚举、config 参数和 project root 归一化。
- scan scope 默认排除、gitignore 行为、supported file 分类和 recoverable diagnostic。
- LOC metrics adapter、语言归并、指标聚合和空 scope。
- warning severity、blocking policy、gate status 和 summary 计数。
- runtime 对 scanner fatal、recoverable diagnostic 和 output write failure 的错误映射。
- 人读输出、JSON report 序列化、schema examples 和 stdout/stderr 分流。

以下行为由 CLI contract 或验证脚本证明外部契约，无需在 Rust 单元测试中建立重复矩阵：

- `clap` 自带且无自定义分支的解析行为。
- 无转换逻辑的字段透传或 serde 序列化。
- 同一校验规则下的多个等价非法值。
- 文档链接、schema 示例和 workspace verifier 输出过滤规则。

### 代码组织

- 小型白盒测试可按相邻模块惯例放在 `#[cfg(test)] mod tests` 中。
- 测试变大、fixture/helper 开始遮蔽主实现时，优先拆到同级 `tests.rs` 子模块，主实现
  文件只声明测试模块。
- 测试通过模块可见性访问私有实现，生产 API 的可见性保持不变。
- 单个测试只证明一个自定义不变量或一个外部契约维度。
- 参数解析和输出测试保持少量高价值用例；新增用例必须覆盖新的 strict input 规则、路
  径边界、输出通道边界或 exit code 映射。
- 跨层测试必须分别断言内部不变量和外部 CLI 契约，不重复相同的参数组合矩阵。

## Fixture projects

Rust CLI contract tests 可以使用 `crates/vibe-check/tests/fixtures/projects/<fixture-id>/`
下的 checked-in project fixtures。Fixture id 使用稳定 kebab-case；fixture source、配置
和 ignore 文件是手写入库的测试环境输入，不需要 npm、go、cargo、pip 或网络依赖即可被
`vibe-check scan` 读取。

Fixture-backed tests 必须直接把 checked-in fixture project path 作为 `vibe-check scan`
的 project root，并且只允许运行 CLI、读取 stdout/stderr、解析 report 和校验 owner
schema。测试代码不得创建、复制、拼接、追加、改写或生成作为 scan input 的 source、
configuration 或 ignore 文件；threshold fixture 也使用入库长文件，而不是运行时生成。

普通单语言 fixture 只承接该语言的 supported source proof target；跨语言、unsupported
`.tsx` / `.js` / `.jsx`、unsupported Markdown、`.gitignore`、generated/vendor/cache
和默认排除边界放入专门 mixed fixture。测试资料只记录 fixture environment、文件分类集
合、证明目标和源码 `@case` 归属；supported file、language identifier、warning、gate
和 output shape 的产品语义仍追溯到 owner 文档、schema 或 examples。

Fixture-backed report 断言应聚焦 schema validity、language presence/absence、
supported/unsupported classification 的可观察结果、diagnostics status、gate status、退
出码和 stdout/stderr 边界。不要为 fixture report 引入完整 JSON snapshot、LOC totals
snapshot、与分类无关的手写 count snapshot 或 human/readable rendering 文案断言。

## 脚本与工具依赖

验证脚本和按需工具依赖的运行方式由 [脚本工具](script-tooling.md) 拥有。本节只定义测
试验证边界：

- 包依赖不要求预先全局安装；新 checkout 初始化、Bun、pnpm 和 toolkit submodule 要求由
  [脚本工具](script-tooling.md#新-checkout-初始化) 维护。
- `bun run typecheck:scripts` 证明 TypeScript 脚本模块 contract 和边界类型一致，不替
  代真实 CLI、schema 或 Rust 测试。
- `bun run lint:scripts` 证明脚本源码没有未使用变量/函数、显式 `any` 和常见静态质量
  问题。
- `bun run quality:check` / `bun run quality:full-check` 证明开发期质量观测链路能生
  成 metrics、warnings、report 和 baseline 相关输出；它们不替代 Rust CLI release
  contract。
- 共享 toolkit 变更还必须运行各自 private manifest 中的 `test`，用于证明 toolkit
  public source entrypoint 可独立通过本地 tooling 检查。

## 统一验证入口

常规交付前使用 Vibe Check workspace 综合验证入口：

```bash
bun run verify:vibe-check-workspace
```

该入口默认运行 full profile，是常规交付前的完整验证入口。

日常开发可先跑 required profile：

```bash
bun run verify:vibe-check-workspace:required
```

required profile 是快速、确定性的必需验证集合，用于日常开发中缩短反馈周期。它包含
`cargo fmt --all --check`、脚本 typecheck、脚本 lint、quick quality check、docs
validators 和 `git diff --check`。

full profile 复用 required profile 中的非 quick quality 检查，使用 full quality check
替代 quick quality check，并追加 toolkit tests、`cargo clippy --all-targets
--all-features -- -D warnings`、`cargo test --all` 和 OpenSpec 严格校验。

workspace verifier 的终端输出用于快速判断当前验证状态：默认展示每个 report 的
completion line 和最终 summary。完整子命令 stdout/stderr 写入
`.log/verify/workspace/latest.log`，验证运行中间状态和 quality artifacts 写入对应
`.cache/`、`.log/` 或 `artifacts/` 目录；这些本地文件不是 release artifact。

开发期快捷入口：

| 命令 | 用途 |
| --- | --- |
| `bun run validate:docs` | 文档链接、JSON、schema 和 examples 校验 |
| `bun run validate` | docs、OpenSpec 和 whitespace 校验 |
| `bun run verify:vibe-check-workspace:required` | 快速验证，只跑必需检查 |
| `bun run verify:vibe-check-workspace:full` | 完整验证，显式运行 full profile |
| `bun run quality:check` | 快速质量检查，生成 quick profile 报告 |
| `bun run quality:full-check` | 全量质量检查，包含 baseline comparison |
| `cargo fmt --all --check` | Rust 格式检查 |
| `cargo clippy --all-targets --all-features -- -D warnings` | Rust lint gate |
| `cargo test --all` | Rust 单元测试和集成测试 |

局部改动仍可先运行范围更小的命令或 required profile；跨 Rust 行为、文档、OpenSpec、
schema、示例、输出边界或多个包边界的交付，最终应运行
`bun run verify:vibe-check-workspace:required` 或更高层级验证。具体检查项和输出过滤规
则由验证脚本维护，本节只定义 profile 用途和交付要求。

## 一致性审计

交付前检查：

1. 新增、删除或修改测试能追溯到 [文档导航](navigation.md#规则所有权) 指向的 owner
   文档。
2. 测试函数变更已按 [测试用例维护](testing/case-maintenance.md) 判断证明目标、case
   归属和账本更新范围。
3. 测试文档只记录覆盖目标、归属和验收边界，不重新定义稳定字段、退出码、warning 规
   则、gate 语义或 CLI 命令语义。
4. schema、示例和 fixture 只校验 documented shape、输出投影和当前 owner 语义，不成为
   新的业务规则来源。
5. OpenSpec change 只作为变更依据、验收和审计历史，不作为日常实现主入口。
6. 当测试暴露规范缺口时，先更新 owner 文档，再同步 schema、示例、实现和验证脚本。
7. 涉及共享 helper 的改动必须覆盖可观察外部行为：CLI strict failure、stdout/stderr
   purity、JSON schema validation、scan scope diagnostic、metrics aggregation、warning
   generation、gate status 和 output write failure。
