# decouple-project-config-from-scanner-tools

本 change 是 `add-external-project-config-workflow` 的语义配置前置：它把 public project config 固定为 Vibe Check-owned 质量意图，并把 scanner backend 执行收口到 Product-owned internal dependency boundary。

## Current status

- 本目录是 OpenSpec planning artifact，不是 current product behavior owner。
- Proposal、design、spec deltas 和 tasks 可以通过 `openspec status --change decouple-project-config-from-scanner-tools` 恢复结构状态；不要从本 README 复制 task count。
- `tasks.md` 的 0.x 是阻塞级 readiness gate。0.x 未全部完成前，禁止修改产品代码或执行 1.x 及以后任务。
- 三项 public-contract 选择已经确认并写入长期 decisions；dependent change planning rebase 已
  完成，但 product runtime、fixture 与 owner docs 尚未通过本 change 修改。

## Confirmed contract

以下方向来自用户目标，作为本 change 的稳定范围：

1. Public project config 不暴露 `lizard`、`scc`、`jscpd`、`command` 或 `args`。
2. Project config 只表达稳定产品语义；dependency command/args、availability、platform resolution 与 operational overrides 留在 Product-owned internal boundary。
3. 该解耦先于 [external config workflow](../add-external-project-config-workflow/README.md)
   实现，避免先生成 tool-shaped config 再迁移。
4. External workflow 继续拥有 `.vibe-check/config.json`、comment-capable JSON、explicit/discovered selection、`init` 与 sibling schema lifecycle；本 change 不复制这些行为。
5. [Lizard TypeScript port](../port-lizard-function-metrics-to-typescript/README.md) 继续是延期的
   最终提升项，不作为本 change 前置。

以下 public-contract 选择已经确认：

| Confirmed choice | Long-term owner | Contract consequence |
| --- | --- | --- |
| `version` 固定为 exact `"1"` contract discriminator | [固定语义配置契约版本](../../../docs/decisions/configuration/use-fixed-semantic-config-version.md) | Schema version 与 caller-defined cache-bust label 分离；cache identity 按真实 measurement inputs 派生 |
| `checks.files` / `checks.functions` / `checks.duplication`，accepted warnings 使用 semantic `checkId` | [语义 check ID](../../../docs/decisions/configuration/use-semantic-check-ids-in-project-config.md) | Threshold/acceptance 不依赖 backend 或 tool-named rule ID；machine identity 暂时保持兼容 |
| Legacy tool-shaped config fail-fast hard cut | [Legacy hard cut](../../../docs/decisions/configuration/hard-cut-legacy-tool-shaped-config.md) | Project command/args 不被静默忽略或执行；不建立 dual-reader precedence |

这些选择确认目标 contract，不表示产品代码已经实现，也不跳过其余 readiness、测试证据或
验证任务。

固定实施顺序为：本 change →
[external config workflow](../add-external-project-config-workflow/README.md) → 延期的
[Lizard TypeScript port](../port-lizard-function-metrics-to-typescript/README.md)。后两者不能
反向定义或迁移 public semantic config。

## Target boundaries

```text
selected semantic bytes
  -> SemanticProjectConfigV1 (runtime schema-derived public value)
  -> ResolvedQualityConfig (readonly product semantics)

host + supported operational inputs
  -> ScannerDependencySnapshot (readonly internal execution value)

ResolvedQualityConfig + ScannerDependencySnapshot
  -> orchestration
       -> scope / warnings / report: semantic slices only
       -> eligible adapter: exact inputs + one dependency slice
```

Stable public responsibilities are grouped by actual consumers:

- `checks.files`：file code-line threshold 与 low-decision-token allowance。
- `checks.functions`：complexity、function code-line、parameter thresholds 与 low-complexity allowance。
- `checks.duplication`：minimum clone size 与 fragment changed delta。

Backend concurrency、syntax/format hint、executable、args、availability 与 process protocol 不是 project semantics。它们不得作为 optional public field 回流。

## External workflow handoff

本 change 只提供 semantic runtime schema、schema-derived type、validation 和 domain mapping seam。后置 `add-external-project-config-workflow` 必须：

1. 复用 semantic schema，不复制 field tree。
2. 将 user-facing path 保持为 `.vibe-check/config.json`；comments/trailing commas 是 content contract，`.jsonc` 只可能是 parser implementation 概念。
3. 只组合 optional `$schema` metadata 并生成 sibling editor schema。
4. Config provenance 只表达 selected source/path/version，不表达 applied backend/tool overrides。
5. Fixture 在本 change 中可显式使用 `--config .vibe-check/config.json`；这不授权提前实现 discovery 或 `init`。

## Deferred Lizard port handoff

本 change 完成后，未来 Lizard port 只需要修改 internal function dependency、adapter/protocol 与 backend cache identity。它不得再要求 project config 删除 `tools.lizard` 或保留 top-level `lizard` thresholds，因为这些 public fields 在 semantic boundary 中都不存在。Machine warning/tool source identity 若要改变，另行进入 Output contract change。

## Artifact reading order

1. [proposal.md](proposal.md)：为什么做、范围、capabilities 与 change ordering。
2. [design.md](design.md)：owner、type/data flow、field mapping、已确认取舍、migration 与风险。
3. [specs](specs)：可观察 target contract；重点从 `scan-configuration` 和 `scanner-dependencies` 开始。
4. [tasks.md](tasks.md)：先完成 0.x readiness，再按 schema → dependency → consumers → fixture/docs → verification 实施。

Proposal 不拥有 implementation detail；design 不替代 observable specs；tasks 不重新定义 fields；实现完成后 owner docs/runtime schema 接替 current fact ownership。

## Coding-style constraints

- 产品 runtime owner 只在 `src/product/**`；`scripts/**` 保持 thin one-way consumer。
- External bytes/environment 先作为 `unknown` 在 boundary 解析、验证、归一化和映射；domain code 不处理 raw object 或 `any`。
- Runtime semantic schema 是唯一 public field owner；derived type、generated schema 与 canonical material 从它派生。
- Dependency boundary 使用具体 typed resolver/slices，不为假想多实现建立 plugin/provider framework。
- Current/baseline/fallback 复用 invocation snapshots；不重新读 config/environment，也不按 source 分叉。
- Failures 使用 typed/discriminated boundary mapping；不静默 fallback、不用空 metrics 掩盖 dependency 失败、不打印完整 environment value。
- Cache identity 按 consumer-specific semantics 与 backend identity 投影，不用 caller label 或全量 config hash 替代责任审查。
- 新增/修改 test entity/body 前后按 AGENTS.md 运行 test-evidence 恢复、最窄 tests 与完整 closure。

## Next action

继续执行 [tasks.md](tasks.md) 中未完成的 0.x：恢复 current facts，完成
field/common-denominator、test-evidence 与最终 artifact readiness audit。0.2、0.4、0.5 已
完成；全部 readiness 闭合后才从 semantic runtime schema 开始实现。
