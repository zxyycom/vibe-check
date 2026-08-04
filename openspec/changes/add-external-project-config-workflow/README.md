# add-external-project-config-workflow

本文件是该 change 的执行索引。它帮助后续实现者恢复状态、术语、权威来源和阅读顺序，
不重复定义产品行为。

## 当前状态

- **Planning**：workflow planning tasks 0.1-0.6 已完成；
  [semantic-config prerequisite](../decouple-project-config-from-scanner-tools/README.md) 已
  `all_done`。本 change 的 readiness task 0.7 仍须依据最终交付事实完成 handoff closure，之后
  才能进入 section 1。
- **已实现基线**：正式 `scan` 已支持显式、完整、strict JSON semantic config v1；省略 flag 时
  仍使用通过同一 schema 的 Vibe Check-specific built-in semantic document；两者映射为
  `ResolvedQualityConfig`。
- **本 change 的目标**：tool-directory discovery、comment-capable JSON、document/editor schema
  composition、`init`、selected-config context 和 dogfood config 迁移；这些 workflow 尚未实现。
- **配置边界**：本 change 只为既有 semantic document 提供发现、authoring、初始化和选择；
  operational overrides 继续只进入 `ScannerDependencySnapshot`。
- **Lizard 顺序**：[Lizard TypeScript port](../port-lizard-function-metrics-to-typescript/README.md)
  继续延期。前置 change 隔离 scanner identity 后，未来 port 不应再触发 public
  config/schema migration。

## Artifact 权威关系

| Artifact | 本 change 中的责任 | 不承担的责任 |
| --- | --- | --- |
| `proposal.md` | 产品问题、目标结果、范围、兼容性和成功条件 | 实现步骤和字段级规范 |
| `design.md` | 当前事实、跨组件决策、实现归属、数据流、失败模型和编码约束 | 可观察 requirement 的唯一表述 |
| `specs/**` | 目标可观察 contract；`SHALL` / `MUST` requirement 与 scenario 是验收依据 | 当前已实现状态和任务进度 |
| `tasks.md` | 有顺序的实施与证据 ledger | 新增或改写产品 contract |
| 当前 `docs/**` 与 `src/product/**` | change 实施前的当前行为事实 | 本 change 的目标行为 |

实现完成后，task 4.1 必须把新行为同步到 `docs/**` owner；OpenSpec 不替代长期 owner。

## 稳定术语

| 术语 | 在本 change 中的唯一含义 |
| --- | --- |
| **tool directory** | normalized project root 下的固定目录 `<project-root>/.vibe-check/` |
| **config document** | 完整配置 fields 加 optional `$schema` metadata 的 UTF-8 Vibe Check JSON document；允许 comments 和 trailing commas |
| **discovered config** | 省略 `--config` 时唯一候选 `.vibe-check/config.json` |
| **semantic document** | 前置 change 定义的 complete、tool-neutral public fields；本 change 不复制 field tree |
| **semantic runtime schema** | Product Config 内置并参与运行时 structural validation 的唯一 public field source |
| **editor schema** | `init` 生成的 `.vibe-check/config.schema.json`；只辅助编辑，不参与 scan validation |
| **`ResolvedQualityConfig`** | Semantic document 移除 metadata 并应用显式 CLI field overrides 后交给 Core 的 readonly config |
| **`SelectedConfig`** | `ResolvedQualityConfig` 加 source、normalized path 和 version 的 planned internal context |

## 目标结果

1. 每次 formal scan 在 scanner work 前选择恰好一份完整 config document。
2. 省略 `--config` 时只发现 tool directory 中的固定 `config.json`；没有 config 时 fail closed。
3. `init [project-root]` 非交互生成 commented config 与对应 editor schema，且不覆盖已有
   `.vibe-check`。
4. Vibe Check dogfood wrapper 显式选择 checked-in tool-directory config，不再依赖仓库专用
   fallback。

## 实施阅读顺序

1. 读 `proposal.md`，确认产品结果、范围和兼容性。
2. 读 `specs/**`，恢复必须实现的可观察行为。
3. 读 `design.md`，恢复 implementation owner、边界模型、数据流和失败处理。
4. 按已交付 semantic-config contract 完成本 change 的 readiness task 0.7，再从 section 1 开始；
   不得跳过相邻 proof、owner sync 或最终 verification。
5. 修改测试前后遵循仓库 test-evidence workflow；不要根据历史 OpenSpec 创建没有当前实体的
   semantic Case。
