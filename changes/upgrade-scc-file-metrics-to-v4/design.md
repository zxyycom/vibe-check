# Design

通过 exact v4 backend、ambient config isolation、可选 Product-owned private config 和双版本 corpus 差分，
在不扩大 public scanner surface 的前提下切换 SCC measurement baseline。

## Context

当前 `fileMetrics` 只接受一个直接执行 SCC CLI 的 `scanner.executable`。owning adapter 负责 `--version`、
`--by-file --format csv`、exact accepted paths、process lifecycle、CSV parsing 和 measurement conversion；public config
不拥有 SCC arguments。SCC 3.7.0 的 exact version text 与十列 by-file CSV 已进入 parser、tests、docs、mise tool key
和 Project Gate 环境绑定。

SCC 4.0.0 不只是 packaging major：上游语言定义和 complexity counting 的变化会进入产品的 threshold settlement。
所以本设计把 upgrade 视为 measurement migration，并要求升级前后两套 binary 在同一 corpus 上给出可审计的差分。

## Goals / Non-Goals

目标：

- 让所有仓库拥有的 SCC execution 明确运行 4.0.0 `/v4`，并阻止旧 binary 或未知 CSV shape 伪装成功。
- 证明 v4 对当前 Product measurement、Records 和 findings 的影响，而不是只证明命令退出为零。
- 隔离 ambient config，同时允许 adapter 在确有稳定语义需要时拥有一份 private、versioned config。
- 保持 exact-input、Check-local ownership、public executable-only option 与 fail-closed behavior。

非目标：

- 不把 SCC config、flags、language remap、reporter 或性能旋钮变成 public Product configuration。
- 不引入 shared scanner registry/backend interface，也不顺带迁移 Lizard 或 jscpd。
- 不启用 SCC MCP、Git/history、LOCOMO、infographic 或额外 metrics，不重新分发 SCC binary。
- 不以“Gate 重新变绿”为理由自动放宽 threshold；threshold 变化必须由 corpus 与产品含义支持。

## Decisions

### Intended Change

#### 1. Exact v4 backend and toolchain

- mise tool key 改为 `go:github.com/boyter/scc/v4`，version 固定为 `v4.0.0`；环境解析代码、Windows binary
  path 和 `VIBE_CHECK_SCC_CMD` 继续指向这份 project-owned installation。
- Go baseline 升至 v4 build 所需的 1.26.4，并同步 lock/material；安装和 candidate evidence 必须打印 actual
  SCC version，而不能只读取声明。
- adapter 把 `scc version 4.0.0` 作为受支持 contract。custom executable 仍可选择命令位置，但不能选择另一套
  protocol 或用 public prefix args 转发。

#### 2. Config isolation and Product-owned semantics

- 每次 scan 显式传 `--no-config`，阻止环境变量和 invocation/project directory 中的配置参与 measurement。
- `--no-config` 只表达 ambient isolation，不排斥显式 `--config`。在 differential spike 证明 v4 默认值不能稳定表达
  Product 既有语义时，adapter 可生成或引用一份仓库拥有、版本化且内容固定的 private config，并同时传
  `--config <owned-path> --no-config`。
- private config 不接受 consumer/project input，不包含 scan targets；exact accepted paths 仍是 invocation CLI 的末端
  positional arguments。adapter-owned output flags 必须具有确定 precedence。
- 若 v4 defaults 已满足 contract，则维持 CLI-only protocol，不创建空 config。该选择及 config identity 是否进入
  cache key，要由差分和 cache tests 记录。

#### 3. Differential measurement migration

- checked-in corpus 至少覆盖 repository 中实际参与 `fileMetrics` 的 TypeScript/JavaScript、Rust、Python、C/C++、
  CUDA 和 diff/Patch representative，并包含 comments/docstrings、Rust `?`、generated/remapped candidates、零文件、
  特殊字符和平台 path cases。
- 对相同 exact path union 分别运行 3.7.0 和 4.0.0，保存 machine-readable observation：version、CSV header、
  normalized Provider/path、`Lines`/`Code`/`Comments`/`Blanks`/`Complexity`，以及进入 owner conversion 后的 Record 与
  finding outcome。
- 每个差异必须归类为预期 upstream correction、Product config requirement 或 regression。无法解释的 header/row、
  language identity、path 或数值变化会阻止 hard cut。
- production 只保留 v4 backend；3.7.0 只作为形成 migration evidence 的 oracle，不成为 fallback。

#### 4. Parser, cache and settlement boundaries

- 非 cognitive `--by-file --format csv` 仍是唯一 production report contract。先验证 v4 是否保留当前十列 shape；若有
  additive 或 breaking change，只实现 Product 实际消费字段所需的完整 shape，继续拒绝未知或 partial batches。
- normalized measurement 的 `sourcePaths` 必须通过现有 exact-membership reconciliation。Provider/path 变化不得绕过
  scope owner。
- backend/version/config identity 必须使 v3 cache 不可能命中 v4。只有 config semantics 改变时才增加独立 raw-scan
  configuration version，不机械 bump unrelated cache schema。
- 既有 area maximum 和 blocking settlement 继续由 `fileMetrics` owner 决定；SCC upgrade 不获得 policy ownership。

#### 5. Migration and governance

- 实施时演进 active Decision，使其准确描述 v4、config isolation 与 executable-only public contract；不要保留
  3.7.0 为 current fact。
- 用户指南同时写明默认 installation、custom command requirement 和数值 baseline 可能变化的迁移说明。
- 对新增、删除、改名或修改的 tests，先后闭合 Test Evidence ledger；candidate 与 installed consumer evidence 必须
  覆盖实际 binary/version，而不只覆盖 source-tree mocks。

### Resulting Impacts

- 版本 hard cut 会让仍指向 SCC 3.7.0 的 custom executable settle unavailable，这是有意兼容性边界。
- 某些语言的 Code/Complexity 会改变；产品影响通过 corpus、Record/finding snapshot 与 repository Gate 显式呈现。
- 如果采用 private config，新增的 adapter material 成为内部 protocol owner，必须与 v4 version 一起维护；如果不采用，
  文档应明确没有隐藏 config dependency。
- Go baseline 更新会影响 project environment bootstrap，但不改变发布包的 TypeScript API，也不表示 package 内携带 SCC。

## Risks / Trade-offs

- 只用 repository corpus 可能遗漏 consumer language；通过覆盖上游已知变化族、repository actual languages 与 malformed
  cases 降低风险，并在新增 language/provider 时重新评估。
- exact version gate 降低 custom binary 弹性，但避免未经验证的 measurement 漂移。以后支持 patch range 必须先证明
  protocol 与计量兼容，而不是复用本 Change 的结论。
- private config 提升可重复性，也增加内部 artifact；因此它是 evidence-driven option，不是默认生成物。
- 提高 Go baseline 可能暂时影响开发环境；在删除 `/v3` pin 前必须先证明 clean install 和 rollback 到本 Change 前
  commit 可恢复。

## Open Questions

- v4.0.0 的 production ten-column CSV 是否与 3.7.0 完全同 shape，还是需要新的明确 parser contract？
- Product 是否需要非默认 v4 remap/generated/complexity semantics；如果需要，哪些最小字段进入 private config？
- repository 的既有 file-metric thresholds 是否仍表达相同工程政策，还是需另立有依据的 policy Change？

这些问题由 1.1 differential evidence 回答；在回答前不得修改 production protocol 或 threshold。

## Resume Conditions

- 开始实现前再次确认 SCC 4.0.0 official release、`/v4` module、Go 1.26.4 requirement 与 config precedence 没有被
  新 stable/errata 改写。
- 取得实施授权，并在当前 HEAD 重新读取 file-metrics、scanner dependency、environment、Gate 与 Test Evidence owners。
- 准备可同时运行 3.7.0 和 4.0.0 的隔离工具环境及 representative corpus；若任一版本不可重复安装，先保存 provenance
  和替代 oracle 决策，不得直接改 production pin。
- 若差分要求改变 public options、增加新 metric、放宽 exact version 或调整 product threshold，先更新 Proposal/Decision；
  不把扩大的产品决策藏在依赖提交中。
