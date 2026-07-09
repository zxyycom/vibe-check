# Design: add-simulated-project-fixtures

## Purpose

本 design 说明如何把 Vibe Check 首批产品支持范围收敛为 `.ts`、`.go`、`.rs` 和 `.py`，并用仓库内手写维护的 fixture projects 作为测试环境，验证这些输入的扫描、指标、warning、gate 和 JSON schema 契约。

## Context

当前 CLI contract tests 主要通过测试代码即时构造输入。该方式反馈快，但项目形态、ignore/default-exclude 边界、unsupported 文件和 threshold 输入不够可审计，也难以复用到后续 Config、accepted warning、结构扫描和真实 corpus 校准。

同时，当前长期材料和实现存在首批支持范围漂移：

- `docs/scan-scope.md` 和 `openspec/specs/scan-scope/spec.md` 把 `.tsx`、`.js`、`.jsx` 纳入 supported file classification。
- `docs/quality-metrics.md` 和 `openspec/specs/quality-metrics/spec.md` 仍包含 `javascript` language identifier。
- `docs/scanner-dependencies.md` 仍把 TypeScript / JavaScript 作为当前最低覆盖和 fixture 验证要求描述。
- `docs/schemas/vibe-check-report.schema.json` 和 JSON examples 允许或使用 `javascript` language summary。
- Rust scan scope、metrics normalization 和 CLI contract tests 当前会把 `.tsx`、`.js`、`.jsx` 当作 supported files。

用户已确认首批产品支持只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`。JavaScript、JSX、TSX 和其它语言属于后续支持范围，首批实现遇到这些文件时应按 unsupported ordinary files 处理。

当前 `vibe-check.report.v1` 尚未发布，因此移除 `javascript` enum 是首批契约收敛，不需要 schema version bump 或兼容迁移。

## Target Contract

| Owner | Contract | Proof |
| --- | --- | --- |
| `scan-scope` | collected ordinary files 中只有最终扩展名为 `.ts`、`.go`、`.rs`、`.py` 的文件进入 supported classification | scan scope unit tests 和 fixture-backed CLI contract tests |
| `quality-metrics` | LOC adapter 只测量首批 supported files，language identifiers 只包含 `go`、`python`、`rust`、`typescript` | metrics unit tests、CLI JSON report shape 和 language presence |
| `output-contract` | JSON schema/examples 只声明当前可产出的 language summaries | schema/example validation |
| `test-fixtures` | checked-in fixture project 作为测试环境承接测试资产结构、文件分类集合和证明目标，不重新定义产品语义或固定统计数字 | docs testing case ledger 和 `@case` 映射 |

## Goals

- 将首批 supported source set 固定为 `.ts`、`.go`、`.rs` 和 `.py`。
- 消除 `.tsx`、`.js`、`.jsx` / `javascript` 仍被声明为首批支持的文档、scanner dependency 文档、schema、示例、实现和测试漂移。
- 建立可复现、可审计的 checked-in fixture projects，作为测试环境覆盖四种首批语言和代表性项目形态。
- 让 fixture-backed CLI contract tests 证明 scan scope、language classification、metrics output shape、JSON schema validation 和 gate behavior 的稳定路径。
- 用测试资料记录每个 fixture environment 的证明目标和文件分类集合，避免测试正文散落不明来源的目录细节。
- Fixture 源码和配置作为测试环境输入手写并提交到仓库；文件或函数级输入可以作为测试用例承接细分场景；fixture-backed tests 直接扫描 checked-in fixture root，不复制、不生成、不修改测试源码。
- 保持 fixture 无网络依赖，不要求语言生态安装或构建。

## Non-Goals

- 不支持 JavaScript、JSX、TSX 或其它非首批语言；后续通过独立 change 增加。
- 不引入真实开源仓库、submodule 或网络下载。
- 不把 fixture project 当作发布 artifact 或产品 runtime 输入。
- 不改变 CLI 参数、report envelope 顶层 shape、scanner adapter 依赖或 release command surface。
- 不修改 human/readable rendering contract。Vibe Check 的核心机器输出是 JSON，可读格式是对该输出的渲染；渲染行为由后续专门 output change 处理。
- 不要求每个 fixture project 都触发所有 warning 分支；跨 fixture 汇总覆盖即可。

## Decisions

### 1. First support set is extension-based and intentionally narrow

首批产品支持集固定为最终扩展名 `.ts`、`.go`、`.rs` 和 `.py`。Scan scope 只把这四类 collected ordinary files 计入 supported classification，LOC metrics adapter 只接收这四类 paths，JSON language summaries 只声明 `go`、`python`、`rust` 和 `typescript`。

首批不做语义级文件名判断；例如 `types.d.ts` 因最终扩展名是 `.ts`，按 TypeScript supported input 处理。generated、vendor、cache、ignore 和默认排除规则仍先决定文件是否被 collected。

`.tsx`、`.js`、`.jsx` 和其它语言普通文件仍可进入 `scope.file_count`，但首批实现中不进入 supported count、metrics adapter 或 language summary。

### 2. Test fixture rules belong to a dedicated capability

新增 `test-fixtures` capability，专门维护 fixture environment 的结构、验证边界和维护规则。`scan-scope`、`quality-metrics` 和 `output-contract` 通过各自 delta 承接产品契约收窄；fixture capability 只承接测试资产，不拥有语言支持语义。

### 3. Store first fixtures beside Rust integration tests

首批 fixture 放在 `crates/vibe-check/tests/fixtures/projects/<fixture-id>/`。当前消费者是 Rust integration tests，它们通过真实 binary 验证 CLI contract；把 fixture 放在 crate test tree 可以保持路径简单，并避免根目录新增未被任何测试直接消费的资产。

测试运行时直接把该 checked-in fixture path 传给 `vibe-check scan`。质量检查是只读行为；并行测试不需要 fixture 副本隔离，任何会写入 fixture 目录的测试行为都应视为错误。

如果后续脚本验证或多 crate 消费这些 fixture，再通过单独 change 迁移到根级 `tests/fixtures/projects/` 并更新 owner 文档。

### 4. Keep normal fixtures single-purpose and isolate mixed inputs

Fixture project 是测试环境，不是单个测试用例。一个环境可以容纳多个文件级或函数级测试用例，尤其是 threshold、classification 或 parser 边界；测试断言仍应指向具体文件、函数或 owner-defined proof target。

首批 fixture environments 至少包含：

- `typescript-app`: 只覆盖 `.ts` 项目输入，必须包含 `.d.ts` 以证明纯扩展名规则。
- `go-service`: 覆盖 `.go` 和简单多文件 package。
- `rust-crate`: 覆盖 `.rs` 和 `target` 默认排除。
- `python-package`: 覆盖 `.py`、普通 unsupported 文件和 `.venv` 默认排除。
- `mixed-scope-boundaries`: 作为专门混合 fixture，覆盖 `.gitignore`、generated/vendor/cache、unsupported Markdown、unsupported `.tsx`/`.js`/`.jsx` 和四种首批 supported language 汇总。

正常项目 fixture environment 不主动混入其它语言来制造复杂度；只有 mixed fixture 承接跨语言和 unsupported extension 边界。`.tsx`、`.js` 或 `.jsx` 只在 mixed fixture 中出现，并必须记录为 unsupported ordinary files。

### 5. Assert format, classification, and presence instead of fixed numbers

Fixture-backed tests 应优先断言稳定格式和分类结果，例如 JSON schema validation、expected language presence/absence、unsupported language 不进入 metrics、默认排除和 ignore 输入不影响 supported language set，以及 warning/gate status。测试不应比较完整 JSON report snapshot，也不应断言 human/readable rendering 文案或与 owner 语义无关的细节。

首批 fixture 不预先固定 LOC totals、scope counts、supported counts 或第三方统计数值。若当前 CLI JSON 只能通过 count 观察某个收集边界，测试可以从 fixture 记录的 expected file classification 派生最小 count 断言，但不得把手写数字或 tokei 的当前统计结果当作 fixture 契约。

### 6. Commit all fixture source code, including threshold inputs

Fixture project 本身是测试环境；测试用例可以落在环境内的文件、函数或测试断言上。所有 fixture source files、配置文件、ignore 文件和 threshold 输入都必须手写并提交到仓库。Fixture-backed tests 直接把 checked-in fixture root 传给真实 `vibe-check` binary，并读取 stdout/stderr 与 JSON report。

Fixture-backed CLI contract tests 不设置 scan input preparation phase；它们直接扫描 checked-in fixture root。测试代码不得承担 fixture 复制、准备目录或 scan input 写入职责。

`file.too_many_lines` 的 high blocking 分支需要至少 800 行输入。实现时应提交手写的 supported source file 作为 threshold testcase；它可以放在现有合适的 fixture environment 中，也可以使用专门的 threshold fixture environment。该长文件带来的 diff 噪声属于本 change 的测试资产成本，不应通过运行时生成代码规避。

## Implementation Flow

1. 先同步产品支持范围：owner docs、JSON schema/examples、Rust scan scope、metrics normalization 和现有 tests 都收敛到 `.ts`、`.go`、`.rs`、`.py`。
2. 再新增 fixture 目录、手写 fixture projects、fixture path 使用约定和 fixture proof target / file classification 记录。
3. 最后迁移或新增 fixture-backed CLI contract tests，并更新测试资料和 case ledger。

该顺序保证产品契约、fixture 输入和 fixture-backed tests 同步落地。

## Risks / Trade-offs

- **现有材料与目标契约冲突**：实现任务必须同步 docs、OpenSpec delta、schema/examples、Rust 实现和测试资料；验证用 OpenSpec strict、schema example validation 和 CLI contract tests 证明收敛。
- **Fixture 变成业务规则来源**：`docs/testing.md` 和 case ledger 只记录证明目标、文件分类集合和验收边界，具体产品语义仍追溯到 scan-scope、quality-metrics、output 或 CLI owner。
- **固定数字掩盖真实契约**：首批 fixture 不固定 LOC/count snapshot；需要 count 时从 documented file classification 派生，且只服务当前可观察边界。
- **Fixture suite 拖慢 required profile**：首批 fixture 全部手写并入库，包括 threshold 长文件；若执行成本上升，拆到 full profile 或后续 corpus profile，而不是复制 fixture 或运行时生成源码。
- **后续支持 JS/JSX/TSX**：通过独立 change 扩展 scan-scope、quality-metrics、output schema/examples、实现和 fixture，不在本 change 中提前声明。
- **Fixture 放在 crate test tree 限制复用**：当前优先满足真实 binary integration tests；出现第二个消费者后再迁移。

## Validation

- `openspec validate add-simulated-project-fixtures --type change --strict --no-interactive`
- `cargo fmt --all --check`
- `cargo test --all`
- `bun run validate`
- `bun run verify:vibe-check-workspace:required`

## Audit Gates

以下门禁已收敛，进入实现时按本 design、tasks 和 delta specs 执行：

1. 首批支持范围只包含 `.ts`、`.go`、`.rs`、`.py`；JavaScript、JSX、TSX 仅作为 unsupported ordinary-file 边界或后续 change 范围出现。
2. 产品语义由 `scan-scope`、`quality-metrics`、`output-contract` 和 CLI owner 承接；`test-fixtures` 只承接测试环境、文件分类集合和 proof target 维护。
3. Fixture project 是测试环境，不是单个测试用例；文件、函数或测试断言承接具体测试用例。
4. Fixture 源码、配置、ignore 和 threshold 输入必须手写并入库；fixture-backed tests 直接扫描 checked-in fixture root，不复制、生成或修改 scan input。
5. 本 change 只同步 JSON schema/examples 中的当前语言枚举；human/readable rendering contract 由后续专门 output change 处理。
6. 实现验证至少覆盖 OpenSpec strict、Rust fmt/tests、docs/schema/examples validation 和 required workspace profile。
