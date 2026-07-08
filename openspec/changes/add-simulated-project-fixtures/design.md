本 design 说明 `add-simulated-project-fixtures` 的实现方案：先把 Vibe Check 首批产品支持范围收敛为 `.ts`、`.go`、`.rs` 和 `.py`，再用仓库内的小型模拟项目验证这些输入的扫描与报告契约。

当前 change 只在 `openspec/changes/add-simulated-project-fixtures/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

当前 CLI contract tests 会在临时目录中即时写入少量文件，再运行真实 `vibe-check` binary。这个方式反馈快，但项目结构不够稳定，也难以复用到后续 Config、accepted warning、结构扫描和真实 corpus 校准。

更重要的是，当前主规范、文档、schema、实现和测试存在首批支持范围不一致：

- `docs/scan-scope.md` 和 `openspec/specs/scan-scope/spec.md` 把 `.tsx`、`.js`、`.jsx` 纳入 supported file classification。
- `docs/quality-metrics.md` 和 `openspec/specs/quality-metrics/spec.md` 仍包含 `javascript` language identifier。
- `docs/schemas/vibe-check-report.schema.json` 允许 `javascript` language summary，JSON example 中也存在 `javascript`。
- Rust 实现和 CLI contract tests 当前会把 `.tsx`、`.js`、`.jsx` 当作 supported files。

本 change 按用户确认的产品方向处理：Vibe Check 首批支持只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`。JavaScript、JSX、TSX 和其它语言属于后续支持范围，首批实现遇到这些文件时按 unsupported ordinary files 处理。

## Goals / Non-Goals

**Goals:**

- 将产品首批 supported source set 固定为 `.ts`、`.go`、`.rs` 和 `.py`。
- 同步 scan scope、quality metrics、output schema/examples、Rust 实现和测试材料，消除 `.tsx`、`.js`、`.jsx` / `javascript` 仍被声明为首批支持的漂移。
- 建立首批可复现的 simulated project fixtures，覆盖 `.ts`、`.go`、`.rs` 和 `.py` 项目输入。
- 让 fixture project 覆盖 scan scope、supported language classification、LOC metrics aggregation、JSON schema validation、human/json projection 和 gate behavior 的代表性路径。
- 用 fixture metadata 或测试 helper 记录每个项目的证明目标和 expected invariants，避免测试正文硬编码不明来源的目录细节。
- 保持 fixture 小、可读、无网络依赖，不要求 npm/go/cargo/pip install 或语言 build。

**Non-Goals:**

- 不支持 JavaScript、JSX、TSX 或其它非首批语言；这些语言后续通过独立 change 增加。
- 不引入真实开源仓库、submodule 或网络下载。
- 不把 fixture project 自身当作发布 artifact 或产品 runtime 输入。
- 不改变 CLI 参数、report envelope 顶层 shape、scanner adapter 依赖或 release command surface。
- 不要求每个模拟项目都触发所有 warning 分支；跨 fixture 汇总覆盖即可。

## Decisions

### Decision 1: First product support set is four source extensions

首批产品支持集固定为 `.ts`、`.go`、`.rs` 和 `.py`。Scan scope 只把这四类普通文件计入 `scope.supported_file_count`，LOC metrics adapter 只接收这四类 supported file paths，JSON language summaries 只声明 `typescript`、`go`、`rust` 和 `python`。

`.tsx`、`.js`、`.jsx` 和其它语言普通文件仍可进入 `scope.file_count`，但在首批实现中作为 unsupported ordinary files 处理，不进入 metrics adapter，也不生成 language summary。

备选方案是保持现有 `.tsx`、`.js`、`.jsx` 支持声明，只在 fixture 中暂不覆盖。该方案会让产品契约和首批测试范围分离，后续容易误以为 JavaScript/JSX/TSX 已经完成首批支持。

### Decision 2: Add `test-fixtures` as a validation asset capability

本 change 新增 `test-fixtures` capability，专门维护 fixture project 的结构、验证边界和维护规则。scan-scope、quality-metrics 和 output-contract 通过各自 delta 承接产品契约收窄；fixture capability 只承接测试资产，不拥有产品语言支持语义。

备选方案是把 fixture 要求分散追加到 `scan-scope` 和 `quality-metrics`。这会把测试资产组织规则混入产品语义，后续 Config 或 corpus fixture 也难以归类。

### Decision 3: Store first fixtures under the Rust crate test tree

首批 fixture 放在 `crates/vibe-check/tests/fixtures/projects/<fixture-id>/`。当前消费者是 Rust integration tests，它们通过真实 binary 验证 CLI contract；把 fixture 放在 crate test tree 可以保持路径简单，并避免根目录新增不被任何测试直接消费的资产。

如果后续脚本验证或多 crate 消费这些 fixture，再通过单独 change 把它们迁移到根级 `tests/fixtures/projects/` 并更新 owner 文档。

### Decision 4: Cover support set plus project-shape edge cases

首批 fixture 不只是按语言建四个空项目，至少应包含：

- `typescript-app`：覆盖 `.ts` 项目输入。
- `go-service`：覆盖 `.go` 和简单多文件 package。
- `rust-crate`：覆盖 `.rs`、`target` 默认排除和 gate warning 生成输入。
- `python-package`：覆盖 `.py`、`.venv` 默认排除和普通 unsupported 文件。
- `mixed-scope-boundaries`：只使用 `.ts`、`.go`、`.rs`、`.py` 和 unsupported Markdown，覆盖 `.gitignore`、generated/vendor/cache 边界和多语言汇总。

实现期还应加入代表性 unsupported extension 输入，例如 `.tsx`、`.js` 或 `.jsx` 中至少一种，证明非首批语言不会进入 supported count 或 metrics。

### Decision 5: Keep expected checks as invariants, not fragile snapshots

每个 fixture 应声明或在测试中集中记录 expected invariants，例如 `scope.file_count`、`scope.supported_file_count`、measured language set、warning count、gate status 和 schema validation。测试不应把完整 JSON report 做 snapshot，也不应断言与 owner 语义无关的文案细节。

LOC exact totals 可以在专门 fixture 中断言小范围稳定值，但跨语言项目默认优先断言聚合结构和语言 presence，避免 `tokei` 内部注释/空行统计变化造成大面积维护。

### Decision 6: Generate threshold stress files in temp copies

`file.too_many_lines` 的 high blocking 分支需要 800 行以上输入。实现时优先由 test helper 在 fixture 被复制到临时目录后生成 threshold stress file，而不是提交 800 行源文件。fixture 目录可以保留短小的 seed project，测试 helper 负责添加确定性大文件并记录证明目标。

备选方案是提交完整长文件。该方案简单但会让 fixture 噪声很大，并降低后续 review 可读性。

## Risks / Trade-offs

- 现有 docs/spec/schema/tests 与首批支持范围冲突 -> 在本 change 的实现任务中同步 scan-scope、quality-metrics、output schema/examples、Rust 实现和测试资料；验证用 OpenSpec strict、schema example validation 和 CLI contract tests 证明收敛。
- Fixture 变成新的业务规则来源 -> 在 `docs/testing.md` 和 case 账本中把证明目标追溯到 scan-scope、quality-metrics、output 或 CLI owner，只断言 owner 已承诺的行为。
- Fixture 数量膨胀导致 `cargo test` 变慢 -> 首批保持小项目，长文件在临时目录生成；若成本上升，拆到 full profile 或 corpus profile。
- 后续需要支持 JS/JSX/TSX -> 通过独立 change 扩展 scan-scope、quality-metrics、output schema/examples、实现和 fixture，不在本 change 中提前声明。
- Fixture 放在 crate test tree 限制跨工具复用 -> 当前优先满足真实 binary integration tests；跨工具复用等出现第二个消费者再迁移。

## Migration Plan

1. 审计并更新 scan-scope、quality-metrics、output-contract 的 delta spec，确认首批支持集只包含 `.ts`、`.go`、`.rs` 和 `.py`。
2. 更新 owner docs、JSON schema/examples、Rust implementation 和现有 tests，移除 `.tsx`、`.js`、`.jsx` / `javascript` 首批支持声明。
3. 创建 fixture project 目录和测试 helper，先迁移当前临时目录式 CLI contract 用例中适合复用的项目结构。
4. 为 `.ts`、`.go`、`.rs`、`.py` 和 mixed scope fixture 添加最小源码、ignore/default-exclude 输入和 expected invariants。
5. 更新 CLI contract tests 使用 fixture copy helper，保留少量直接生成目录的测试用于特殊 path/error cases。
6. 按测试用例维护规则更新 `docs/testing/cases.md` 和必要 `@case` 标记。
7. 运行 `cargo fmt --all --check`、`cargo test --all`、`bun run validate`，范围扩大时运行 `bun run verify:vibe-check-workspace:required`。

Rollback 策略：如果支持范围收窄暴露更大的兼容或契约问题，不保留半收敛状态；先回退实现修改，重新拆分为“语言支持收窄”和“fixture 基础设施”两个 change。

## Open Questions

无未回答开放问题，可以进入实现前审计。实现前审计需要确认首批产品支持和首批 fixture 均没有引入 JavaScript、JSX、TSX 或其它非 `.ts`、`.go`、`.rs`、`.py` supported inputs。
