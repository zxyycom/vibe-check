# Design

通过 exact v4 backend、ambient config isolation、可选 Product-owned private config 和双版本 corpus 差分，
在不扩大 public scanner surface 的前提下切换 SCC measurement baseline。

## Context

本 Change 形成时，`fileMetrics` 只接受一个直接执行 SCC CLI 的 `scanner.executable`。owning adapter 负责 `--version`、
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
- 不改变既有 threshold：它仍由 `fileMetrics` area owner 作为非阻断观测策略拥有，不因本次 migration 或 Gate 结果调整。

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

- checked-in corpus 覆盖 repository 实际参与 `fileMetrics` 的 TypeScript/JavaScript、Rust、Python、C/C++、CUDA 与
  diff/Patch representative，并包含 comments/docstrings、Rust `?`、带空格路径和稳定非阻断 finding。空 exact input、
  malformed output 与 Windows/Unix path contract 由 owning adapter tests 证明，而不是由该双版本 corpus 伪装覆盖。
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
- 已验证的产品影响只有 Rust `?` 的 `Complexity` `0 → 1`；它未改变 corpus 的 Record/finding settlement。其余 corpus 的
  `Code`、Provider/path、Record 与 finding 保持一致，threshold 仍不阻断。
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

已由 [`evidence/differential/classification.json`](evidence/differential/classification.json) 关闭：

- v4.0.0 保留十列 production CSV shape，所以 parser 只更新 exact version，不改变字段 contract。
- v4 defaults 在受控 corpus 上满足 Product semantics；不采用 Product-owned private config。
- threshold 保持既有非阻断观测策略；没有 policy Change。唯一 Rust `?` Complexity drift 有上游修正依据，且不改变 corpus 的 Record/finding settlement。

## Implementation Observations

- 完成的 Linux x64/glibc evidence、重跑步骤和 observation/classification 的职责边界见
  [`evidence/verification.md`](evidence/verification.md) 与
  [`evidence/differential/README.md`](evidence/differential/README.md)。它们是本 Change 的完成证据，不是所有
  consumer language 或 Windows 实机兼容性的声明。
- 已确认的 current protocol 由
  [`docs/checks/file-metrics.md`](../../docs/checks/file-metrics.md) 和
  [`docs/scanner-dependencies.md`](../../docs/scanner-dependencies.md) 持有；长期 hard-cut 判断由
  [`use-scc-v4-file-metrics-cli-protocol`](../../docs/decisions/use-scc-v4-file-metrics-cli-protocol.md) 持有。
- 如需重新评估 SCC 版本、config precedence 或差分，则先重新验证 SCC 4.0.0、`/v4` module 和 Go 1.26.4，再重跑受控
  corpus；未分类漂移阻止 production change。任何 public option、metric、version-range 或 threshold 政策变更都不属于
  本 Change，必须另行取得产品决策与 Change 授权。
