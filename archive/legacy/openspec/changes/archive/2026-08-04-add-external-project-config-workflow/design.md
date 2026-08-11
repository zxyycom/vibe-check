## Design Purpose

本 design 说明 external config workflow 的实现关系。Observable behavior 以 `specs/**` 为准；
semantic field tree 继续由 Product Config runtime schema 拥有；实施步骤以 `tasks.md` 为准。

## Runtime Flow

一次 scan 在进入 dependency preflight 前完成以下流程：

1. Product CLI 解析 operation、project root、scan options 和 gate request。
2. Product Config 按 `explicit > discovered > default` 选择一个 source：
   - `--config` 选择 explicit file；
   - 否则选择存在的 `<project-root>/.vibe-check/config.json`；
   - explicit 与 discovered candidate 均 absent 且 gate disabled 时选择 neutral default。
   Explicit 和 discovered 统称 file-backed source。
3. Gate request 要求 file-backed source。Selected file 的 validation result 是最终结果。
4. Product Config 应用 `--top-n` / `--artifact-dir`，产生一个 invocation-owned
   `ResolvedQualityConfig`。
5. CLI 输出 concise config provenance，随后构造 `ScannerDependencySnapshot` 并启动 scan core。
6. Current、baseline 和 Git-failure fallback 复用同一个 resolved config。

```text
CLI input
  -> project root + normalized scan plan
  -> explicit file | discovered file | neutral default
  -> one ResolvedQualityConfig
  -> dependency snapshot
  -> scan core
```

## Boundary Types

```text
SemanticProjectConfigV1
  complete semantic fields owned by Product Config

ConfigDocument
  SemanticProjectConfigV1 + optional "$schema"

SelectedConfig
  config: ResolvedQualityConfig
  source: "default" | "explicit" | "discovered"
  path?: normalized absolute path  // explicit/discovered only
```

`config.version` 已经提供 semantic version，selection context 不保存重复字段。`$schema` 只存在于
document boundary。

## Responsibility Map

| Owner | Responsibility |
| --- | --- |
| Product CLI | Operation routing、project-root normalization、help、console 和 exit mapping |
| Product Config | Neutral default、document schema、loader、selection、mapping 和 init generation |
| Scan orchestration | 在 dependency preflight 前固定 selected config，并传递 resolved value |
| Scanner Dependencies | 独立构造 invocation-scoped dependency snapshot |
| Product Core / Scanner | 消费 resolved semantic config 和 dependency slices |
| Dogfood wrapper | 插入 repository root并透明转发调用者 args/output/status |

## Default and Document Sources

`NeutralProjectConfig` 是一份 complete `SemanticProjectConfigV1`。Exact scope、area、quality、
report 和 path values 由
[`Neutral default configuration`](specs/scan-configuration/spec.md#requirement-neutral-default-configuration)
定义。

同一个 typed value 服务两个 consumer：

1. Ungated missing-file scan 直接映射为 runtime config。
2. `init` serializer 用它生成缺失的 config document。

新生成的 document 重新加载并将 `$schema` 作为 metadata 处理后，必须与 typed neutral value
深度相等。这个 round-trip proof 保证 default observation 和新初始化的 project 使用同一
policy source。

File-backed document 是 complete、authoritative semantic value。CLI field overrides 在 document
validation 后应用，selected document 保持本次 mapping 的唯一 project-policy source。

## Vibe Check JSON and Schema Authority

File loader 对 bytes 依次执行：

1. Regular-file check。
2. Fatal UTF-8 decode。
3. `Bun.JSONC.parse`，接受 comments、trailing commas 和 strict JSON subset。
4. Composed document schema validation。
5. Product Config semantic post-validation。
6. `$schema` removal 和 detached semantic mapping。

Composed document schema 复用 `SemanticProjectConfigV1Schema`，只增加 optional `$schema` metadata。
Base published schema 保持既有 `$id`；local editor projection 使用 anonymous schema identity，
使两个 document shape 各自拥有明确 identity。

Runtime validation 始终使用内置 composed schema。Sibling `config.schema.json` 是同一 source 的
deterministic editor projection，专门服务 editor 和 independent drift validation。

## Initialization

`init [project-root]` 先在内存中生成并验证：

```text
<project-root>/.vibe-check/
  config.json
  config.schema.json
```

`config.json` 使用 UTF-8、LF、two-space indentation、trailing newline 和相对
`"$schema": "./config.schema.json"`。Section comments 只解释 scope、checks、report 和 output
paths；schema descriptions 承接字段级说明。

`init` 是可重复的 ensure operation。Filesystem ownership 按精确 path 建立：

1. Project root 必须是 existing directory；两份 bytes 在 mutation 前完成 self-validation。
2. Missing `.vibe-check` 由 invocation 创建；existing non-symlink directory 直接复用并保留其
   entries。
3. 每个 missing target 使用 exclusive file creation；每个 existing normal non-symlink file
   视为已经满足并保持原字节。两个 target 均已存在时不写文件。
4. Scan-time production loader 拥有 selected config validation，sibling schema 继续只服务 editor。
5. Unsafe target 或 exclusive-create race 形成 failure。Handled failure 只清理本 invocation
   创建的 target files；tool directory 仅在同一 invocation 创建且仍为空时清理。
6. 首次或重复 success 都输出两个 target 的 absolute paths 和 discovery-ready 状态。

## Diagnostics and Console

| Result | Human output | Exit / next boundary |
| --- | --- | --- |
| Neutral default selected | `default (not persisted)` | 继续 dependency preflight |
| File selected | source + normalized path | 继续 dependency preflight |
| Gate missing file-backed policy | candidate path + `init` / `--config` recovery | exit `3` before scan work |
| Selected document invalid | selected path + field/location/reason | exit `3` before scan work |
| Init cannot ensure safe target set | root/target/stage + preserved-state recovery | exit `3` after owned cleanup |

Config provenance 只进入 human console 和 diagnostics；machine v1 保持现有 fields。Diagnostic
renderer 只输出定位和恢复所需的最少信息；完整 config 与 environment value 保留在其 owner
boundary 内。

## Repository Dogfood

Repository policy 位于 `<repo-root>/.vibe-check/config.json`，对应 schema 来自同一 document
schema source。`scripts/quality/scan.ts` 保持 root-only wrapper，因此 `quality:*` 使用正式 discovery；
调用者通过 `quality:scan -- --config <file>` 提供 explicit source 时仍遵循 public precedence。

## Delivery Constraint

Selection cutover 与 repository policy 同一 phase 交付：先证明 checked-in document 可由 existing
explicit loader 接受，再启用 discovery、neutral default 和 gate prerequisite。这样 repository
gate 在 cutover 后立即拥有 file-backed policy。

## Verification Map

| Surface | Required evidence |
| --- | --- |
| Default/document | Exact neutral value、schema validation、JSON/JSONC equivalence、round-trip equality |
| Selection | Explicit precedence、discovery、ungated default、gate prerequisite、terminal file error |
| Initialization | Deterministic generated bytes、repeat ensure、existing-file preservation、exclusive missing-target creation、owned cleanup |
| Runtime | One resolved config shared by current/baseline/fallback；dependency boundary unchanged |
| Formal entry | Clean project、initialized project、explicit override、schema independence |
| Dogfood | Repository config discovered by quick/full/default/gate entries |
