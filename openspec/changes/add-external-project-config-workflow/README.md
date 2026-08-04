# add-external-project-config-workflow

本文件是 change 的执行索引。目标行为由 `specs/**` 定义，架构关系由 `design.md` 定义，实施
进度由 `tasks.md` 定义。

## 目标摘要

1. 非 gate scan 可直接使用中性默认值完成全项目观察。
2. Gate scan 使用 explicit `--config` 或 `.vibe-check/config.json` 中的项目政策。
3. `init [project-root]` 将中性默认值完整写入 `.vibe-check/config.json`，并生成 editor schema。
4. Explicit、discovered 和 default source 进入同一个 config validation、mapping 和 scan pipeline。

## Artifact owner

| Artifact | Owner responsibility |
| --- | --- |
| `proposal.md` | 产品问题、目标结果、范围和成功条件 |
| `specs/**` | 可观察 contract 和验收 scenarios |
| `design.md` | 数据流、责任边界、schema authority 和安全写入模型 |
| `tasks.md` | 实施顺序、进度和验证证据 |
| `docs/**` / `src/product/**` | 当前 product contract 与 runtime fact；OpenSpec 只描述目标 change |

## 阅读顺序

1. `proposal.md`：确认结果和范围。
2. `specs/**`：恢复必须兑现的行为。
3. `design.md`：恢复实现 owner 和数据流。
4. `tasks.md`：按 phase 实施并记录证据。

## 实施阶段

| Phase | Result |
| --- | --- |
| 1. Default and document foundation | 单一中性默认值、document schema 和 Vibe Check JSON loader |
| 2. Initialization | `init` 生成完整 config/schema，并安全写入 tool directory |
| 3. Selection and dogfood | explicit/discovery/default selection、gate prerequisite 和 repository policy |
| 4. Acceptance | 正式入口、fixture、schema authority 和 dogfood 证据 |
| 5. Owners and verification | 长期 owner、Cases 和 workspace validation 同步 |
