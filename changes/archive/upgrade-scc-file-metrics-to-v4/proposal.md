# Proposal

把 SCC 3.7.0 升级到 4.0.0，并把这次 major upgrade 作为一次有差分证据、可回溯的
`fileMetrics` 计量迁移，而不是普通版本替换。public API 保持 executable-only，配置与 CSV protocol 继续由 adapter 私有拥有。

## Why

本 Change 形成时，仓库用 SCC 3.7.0 为 `fileMetrics` 生成逐文件 `Code` 与 `Complexity` measurement，并在
`mise.toml` 固定 `go:github.com/boyter/scc/v3`。SCC 4.0.0 已成为新的 stable major；它修正或扩展了
Rust `?` complexity、Python docstring、C/C++/CUDA、TypeScript/JavaScript、diff/Patch 等语言识别和计数，
同时把安装路径迁到 `/v4` 并提高 Go toolchain 要求。因此只替换版本号会把真实计量变化伪装成普通依赖维护，
也可能让现有 threshold、CSV parser、Project Gate 与 custom executable consumer 静默漂移。

形成时调查及其证据边界见
[`assess-scc-and-jscpd-upgrade-readiness`](../../docs/investigations/assess-scc-and-jscpd-upgrade-readiness.md)。
当前 adapter ownership 与 public scanner 边界由
[`use-scc-v4-file-metrics-cli-protocol`](../../docs/decisions/use-scc-v4-file-metrics-cli-protocol.md)持有。

## Outcome

将仓库拥有的 SCC baseline 从 3.7.0 迁移到 4.0.0，并以可复核的 differential evidence 证明新的
`Code`、`Complexity`、Provider/path 与 CSV contract。迁移后，`fileMetrics` 仍只公开
`scanner.executable`；owning adapter 隔离 ambient SCC config、固定 exact inputs 和输出协议，并对不能形成完整可信
measurement 的版本或输出 fail closed。

## Scope

### Intended Change

- 把仓库工具声明、环境解析和 adapter compatibility contract 从 SCC 3.7.0 `/v3` 更新到 SCC 4.0.0 `/v4`，
  并满足 v4 所需的 Go 1.26.4 toolchain baseline。
- 建立受版本控制的代表性语料，对 3.7.0 与 4.0.0 的逐文件 CSV、`Code`、`Complexity`、Provider/path、
  Record 与最终 finding 做差分；把有上游依据的变化记录为 migration evidence，把其它变化当成 regression 处理。
- adapter 始终用 `--no-config` 排除 `SCC_CONFIG_PATH` 和项目目录中的 ambient config。若差分结果证明需要固定
  remap、generated、complexity、ignore 等非默认 v4 语义，则同时传入 Product-owned、versioned private
  `--config`；若无需非默认语义，则不创建无价值配置。exact scan paths 始终由 adapter CLI 参数提供。
- 保留 SCC adapter 对 `--by-file --format csv` 的所有权和完整 header/row 校验；只有证据要求时才修改 parser，
  不因上游出现更多输出能力而扩展 public measurement model。
- 同步安装说明、scanner dependency owner、测试证据、Project Gate expectation，以及仍描述 3.7.0 contract 的
  active Decision；明确 custom SCC 3.7.0 executable 不再满足新 contract。

### Resulting Impacts

- `fileMetrics` 的 public TypeScript option shape 不变。已完成的差分只确认 Rust `?` 的 `Complexity` 从 `0` 到 `1`；
  `Code`、Provider/path、Record 与 finding 没有漂移。既有 threshold 和 fixture expectation 不变，且 threshold 继续是
  area-owned 的非阻断观测策略。
- repository dogfood 和开发环境改为解析 `/v4` SCC binary；旧 `/v3` tool installation 不再是充分环境。
- 显式提供 custom executable 的 consumer 需要提供能通过 SCC 4.0.0 version probe 和 v4 CSV contract 的命令。
- cache/backend identity 必须区分新版本；不得把 3.7.0 raw measurement 当成 4.0.0 结果复用。

本 Change 不引入 public SCC args/config，不建立通用 scanner abstraction，不采用 MCP、Git processing、LOCOMO、
infographic 或新增 reporter，也不负责重新分发 SCC binary。它不扩展 `fileMetrics` 的 public metrics，且不修改
Lizard、jscpd 或其它 Check。

## Success Criteria

- project-owned install、environment management、version probe 与 actual invocation 都解析 SCC 4.0.0 `/v4`，并在
  候选环境中证明 Go 1.26.4 requirement 可重复满足。
- differential corpus 覆盖仓库实际语言以及 v4 已知变化类别；每项 CSV/header、Provider/path、`Code`、`Complexity`、
  Record 与 finding 差异都有 intentional 或 regression 分类，未解释的漂移不能进入 migration。
- ambient user/project SCC config 不能改变 measurement；若采用 Product-owned config，其路径、内容、版本 identity
  与 precedence 均由测试证明，且 exact paths 不来自 config。
- CSV header、row、Provider/path、empty input、timeout/cancellation、non-zero exit 与 malformed output 保持完整、
  fail-closed 的 adapter contract。
- public API 仍只允许 executable selection；文档和 migration note 明示 custom 3.7.0 command 的兼容性变化。
- 最窄测试、Test Evidence、typecheck、lint、dependency/environment checks、candidate/consumer evidence、required 与
  full Project Gate 通过，相关 docs、Decision 与 Change 检查闭合。

## Affected Owners

- `src/package-checks/file-metrics/**`
- `scripts/environment/manage.ts`
- `scripts/project/gate/**`
- `mise.toml` 与 Go/tool lock material
- `docs/checks/file-metrics.md`
- `docs/scanner-dependencies.md`
- `docs/testing/cases/check-owned-scanners.md`
- `docs/decisions/use-scc-v4-file-metrics-cli-protocol.md`
