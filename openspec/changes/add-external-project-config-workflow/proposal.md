## Change 状态

当前产品已经通过 `--config` 接受显式完整 JSON config；该能力及 external-project fixture
已实现并归档。Project-root discovery、`init`、selected-config provenance 与 checked-in
dogfood config 迁移尚未实现。

Planning audit 0.1-0.3 已完成。Implementation 仍被 task 0.4 阻塞，因为活动中的 Lizard
TypeScript port 会从完整 config 移除 runtime `tools.lizard` command。

## Why

调用者省略 `--config` 时，Product CLI 当前会创建 Vibe Check 仓库专用
`DEFAULT_CONFIG`。其中包含 Vibe Check-specific include globs、code areas、report text、
artifact paths 和 dependency commands。调用者只有手写并显式选择一份完整
`QualityConfig`，才能安全扫描其它项目；canonical fixture 又有意保持完整而较长。

缺少的产品结果不是另一种 fallback。每个外部项目需要一条可预测、local、可审阅的 config
路径和非交互初始化方式；Vibe Check 仓库不能继续充当无关 project root 的隐式默认值。

## What Changes

- Formal `scan` 在省略 `--config` 时只发现
  `<project-root>/vibe-check.config.json`。
- 显式 `--config` 保持最高优先级；显式与 discovered files 不互相 merge。
- 缺少 config 时，在 banner、scanner、baseline、cache 和 artifacts 前失败，并提示
  `init` 或 `--config`。
- Product CLI 新增 `init [project-root]`，以 exclusive create 写出一份完整、
  repository-neutral starter；不扫描、不联网、不覆盖。
- Config selection 返回一个 product-owned context，包含 parsed `QualityConfig`、source、
  resolved path、version 和已应用的声明式 tool overrides。
- 最终 config shape 中仍有效的现有 `VIBE_CHECK_*` tool overrides 在 file selection 后由
  Product Config owner 统一应用；不允许其它 environment/default merge。
- 仓库在 `<repo-root>/vibe-check.config.json` 保存 dogfood config；所有 `quality:*`
  wrappers 都显式选择它。
- Console preflight 显示 config source、path、version 和已应用 tool overrides。本 change
  不把这些值加入稳定 machine DTO。

## Success Criteria

- 同一完整 config 通过显式路径或 root discovery 选择时，产生相同 resolved scan scope 和
  scanner exact inputs。
- 没有 config 的 project 在 scanner/artifact work 前以 exit `3` 失败。
- `init` deterministic、repository-neutral、能通过当前 complete-config parser，并以
  exclusive create 保证已有文件 bytes 不变。
- Dogfood 不再依赖隐式 repository-specific fallback；受支持平台/tool override 行为仍由
  Product Config owner 承接。
- Help、console provenance、owner docs、fixtures、tests 和 semantic Cases 只描述一套
  precedence 与 discovery path。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `scan-configuration`：root-only discovery、exclusive initialization、selection context 和
  declared tool override precedence。
- `cli-contract`：`init` routing 与 configuration workflow help。
- `scan-scope`：一个 selected complete config 进入既有 normalization pipeline。
- `test-fixtures`：external onboarding、precedence、failure 与 dogfood isolation proofs。

## Dependencies and Impact

- 依赖已归档的 explicit-config capability。
- 活动 Lizard port 完成、取消或显式收缩后，必须按最终 complete config shape rebase。
- 不依赖 machine-output implementation。Selection provenance 留在 Config/CLI runtime 与
  console；machine-visible provenance 需要独立 versioned output 决策。
- 影响 Product CLI routing、config selection/resolution、help、dogfood wrapper args、
  fixtures、owner docs 和 tests。不改变 scanner algorithms、thresholds、warning、gate 或
  artifact filenames。
