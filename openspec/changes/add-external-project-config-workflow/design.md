## 当前事实

| Surface | 当前已实现行为 |
| --- | --- |
| CLI operations | 只路由 `scan`；`init` 是 unknown command。 |
| Omitted config | `runScan` 调用 `createDefaultConfig()`，因此任意 project root 都会继承 Vibe Check-specific values。 |
| Explicit config | `--config <file>` 选择一份完整 UTF-8 JSON `QualityConfig`；相对路径基于 normalized project root，且 file 整体替换 defaults。 |
| Environment tools | `VIBE_CHECK_*` command/args overrides 目前只在创建 built-in default config 时应用。 |
| Dogfood wrapper | `scripts/quality/scan.ts` 传入 repository root，但不传 config path。 |
| External proof | `fixtures/projects/configured-typescript/` 证明从 fixture root 外显式选择完整 config。 |
| Machine output | 当前 metadata 暴露 `configVersion`；稳定的 selected source/path provenance 尚未定义。 |

以上是 implementation facts，不是目标行为。下述目标会替换 omitted-config fallback 与
dogfood selection，同时保留既有 complete JSON field model。

## Goals / Non-Goals

### Goals

- 每次 formal scan 在 scanner work 前恰好选择一份可信 project config。
- 外部项目无需复制内部 fixture，就能生成并发现 deterministic starter。
- Explicit path、discovered path、environment tool override 和 CLI field precedence 清楚且
  可观察。
- Dogfood 复用同一 public config contract，不把 config 逻辑搬入 wrapper。

### Non-Goals

- Partial config、deep merge、inheritance、preset、executable config module 或 remote
  config。
- Parent-directory、launch-cwd、worktree 或 home discovery。
- Package installation/distribution、dependency installation 或 package-script mutation。
- Config source/path 的 machine DTO fields。
- Scanner、threshold、warning、gate 或 artifact contract change。

## Decisions

### Decision 1: 只发现 normalized project root 的固定文件

省略 `--config` 时，`scan` 只检查 `<project-root>/vibe-check.config.json`。不搜索 parent、
launch cwd、worktree root 或 home。显式 `--config` 保持最高优先级，并沿用当前 path
resolution。

### Decision 2: 缺少 config 时 fail closed

显式与 discovered config 都不存在时，CLI 在 banner、scanner preflight、baseline、cache 和
artifacts 前以 config/usage exit `3` 失败。Diagnostic 提供两条正向恢复路径：运行
`init [project-root]`，或传入 `--config <file>`。

### Decision 3: Persisted config 继续使用完整 `QualityConfig`

本 workflow v1 不创建第二套 public field model。Explicit、discovered、generated 和
dogfood files 都包含当前完整 `QualityConfig`；现有 strict parser 继续拥有 field/type
定义。

Product Config owner 只在 parsed value 外增加一个小型 internal selection context：

```text
SelectedConfig
  config: QualityConfig
  source: explicit | discovered
  path: absolute normalized path
  version: config.version
  appliedToolOverrides: declared VIBE_CHECK_* names
```

该 context 只拥有 selection provenance。Core scan scope 接收 resolved `config`，不按
`source` 分支。

### Decision 4: `init` 生成单一 mixed repository-neutral starter

`init [project-root]` 以 exclusive file creation 创建
`<project-root>/vibe-check.config.json`。第一版只提供一个 mixed starter，不引入
`--preset` taxonomy。Starter 是可编辑起点，不做 project inference：`init` 不检测语言、不
运行 scanner、不联网、不修改 package scripts。

Generator 使用 implementation revision 的 current complete config schema，并且不得复制：

| 当前 dogfood value 类别 | Starter 要求 |
| --- | --- |
| `src/product/**`、`scripts/**`、docs/OpenSpec include globs | 使用 repository-neutral source/generated scope。 |
| Product/script/docs-specific code areas 与 jscpd area maps | 使用内部一致的 neutral area names。 |
| Vibe Check report title/notices | 使用 product-neutral report text。 |
| `artifacts/vibe-check-quality` 与 `.cache/vibe-check/quality` | 使用 project-local neutral paths。 |
| Source-checkout absolute tool paths | Port 完成后的 starter 固定使用 `tools.scc = { command: "scc", args: [] }` 与 `tools.jscpd = { command: "jscpd", args: [] }`；declared environment overrides 可解析其它 local installation。 |

如果 task 0.4 记录 Lizard port 被取消或延期，implementation 必须先把本表、delta
specs、starter fixture 和 dogfood config rebase 到当时完整 tool shape，不能在未定义跨平台
Python command 的情况下直接生成 starter。

### Decision 5: Config precedence 只有一个 owner

Product Config owner 按以下顺序应用 precedence：

1. 选择并严格解析一份 explicit 或 discovered complete config；
2. 只应用仍对应当前 config fields 的受支持 `VIBE_CHECK_*` tool command/args overrides；
3. 应用显式 `--top-n` 与 `--artifact-dir` CLI overrides。

其它 built-in value、file、environment variable 或 partial merge 都不参与。把既有 tool
overrides 应用于所有 selected sources，可以保留 dogfood/platform resolution，且不把
config mutation 移入 wrapper。Console preflight 列出 applied override names，避免隐式
effective source。

### Decision 6: Provenance 属于 runtime/console context，不属于 machine v1

Config source、path、version 和 applied override names 在 `runQualityScan` 前可用，并在
dependency preflight 前打印。本 change 不把它们加入 `MachineMetricsV1`。Machine consumer
以后确有需要时，由显式 output-contract change 定义 projection 与 version。

### Decision 7: Dogfood 显式选择 root config

仓库拥有 `<repo-root>/vibe-check.config.json`。`scripts/quality/scan.ts` 继续只调用一次
formal Product CLI，但始终传入 repository root 和 `--config vibe-check.config.json`。
Wrapper 不解析、不 merge、不生成 config。

## Dependencies and Ordering

1. `stabilize-machine-readable-output` 可以先完成；本 change 不改变 machine v1。
2. `port-lizard-function-metrics-to-typescript` 与本 change 都改变 complete-config/tool
   expectations。两者同时 active 时，port 应先完成，避免 generated/dogfood config 立即保留
   已退休的 `tools.lizard` command。
3. Implementation 前，task 0.4 必须记录 port 已完成、已取消，或已明确延期且接受后续 config
   migration。两个 hard cuts 不得并行实施。

## Risks and Recovery

- 完整 starter 较长。Deterministic generation 消除 copy/paste onboarding；只有真实维护
  证据表明完整文件仍造成负担时，才独立设计 partial public config。
- Fail-closed 改变 omitted-config behavior。Root discovery 加 `init` 是迁移路径；dogfood
  在同一 revision 迁移。
- Tool environment overrides 如果隐藏会令调用者意外。Allowed field set 与 precedence
  closed，console preflight 显示 applied names。
- Existing config 绝不能被覆盖。Exclusive creation 是 correctness boundary；先检查再普通
  write 不足以满足该合同。

Rollback 必须以 repository revision 为单位：同时恢复 built-in fallback、删除
discovery/init、恢复 wrapper behavior 以及对应 help/tests/docs。

## Deferred Triggers

- 只有 generated complete configs 显示具体维护或兼容问题时，才新建 public partial-config
  change。
- 只有产品目标超出当前 formal local source-checkout entry 时，才新建
  package/distribution change。
- 只有通过 versioned output-contract change，才增加 machine-visible config provenance。

## Open Questions

目标设计无未决问题。Task 0.4 是 implementation-order gate，不是未确认 product choice。
