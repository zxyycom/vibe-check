本 proposal 为 project config 增加文件级 check policy 覆盖；它是临时 change artifact，尚未表示方案已审计或获准实现。

## Why

当前 semantic config 只能为整个项目提供一组完整 thresholds 和 check settings，README、长篇设计文档、生成示例或特定目录无法在保留同一全局 scope 的同时使用不同质量政策。任意 deep merge 又会让覆盖顺序、数组行为、scope eligibility 与 cache identity无法可靠解释。

## What Changes

- **BREAKING**：引入 single-active semantic project config v2，将 `version` 固定为 `"2"`，在完整 base policy 上增加 required `overrides` array；neutral default 与 `init` 生成物使用空 array，v1 file-backed document 通过明确 migration diagnostic hard cut，不提供 dual reader。
- Config v2 保留现有 required core check sections，并允许 Product registry 贡献 optional、closed、tool-neutral feature sections；缺失 optional section 明确表示该 capability 未配置并保持 `skipped`，loader 不补默认值。每个 feature change 必须同时拥有 section schema、neutral-default contribution、semantic check IDs 与 overrideable-leaf metadata。
- 每个 override 必须声明稳定 `name`、project-relative `files` globs 和 closed partial `checks` patch；patch schema 从同一个 registry-composed check schema source 派生，不接受 arbitrary key、backend/tool identity、`null` deletion 或 untyped value，也不得通过 patch 新建 base 中未声明的 optional feature section。
- 匹配 normalized project-relative path 的 overrides 按 document 声明顺序应用；object 只递归覆盖已声明 leaves，array 整体替换且不隐式拼接，后匹配 override 对同一 leaf 生效。
- Overrides 只可修改 capability-owned check settings；不得修改 `version`、global include/exclude/generated scope、code areas、acceptance、report、artifact/cache paths、config source 或 scanner dependency settings。
- Config/Core 为 normalized inventory 中每个文件解析一个 immutable `ResolvedFilePolicy`；capability selector可据 `enabled`/target settings缩小 exact inputs，但 override不得把 global scope 外文件重新加入。Current、baseline与 fallback对同一路径使用同一 resolution chain。
- 新增只读 `explain-config [project-root] <file>` CLI，用 base 与 matched override names/declared leaves解释最终 file policy；该命令不启动 scanner、baseline、cache或 artifact work。
- 本 change 依赖 `introduce-content-quality-foundation` 的 descriptor/exact-input与 capability-specific cache projection，但不加入任何具体 Markdown、JSON、schema、path、secret或network fields。

## Capabilities

### New Capabilities

- `file-policy-resolution`: 定义 typed check patches、ordered matching、leaf/array merge、resolved per-file policy、provenance 与 explain behavior。

### Modified Capabilities

- `scan-configuration`: 将 closed semantic document 升级为 v2，并定义 overrides schema、neutral default、hard-cut migration、selection 与 resolution authority。
- `scan-scope`: 在 global normalized inventory 后消费 per-file resolved policy，允许 capability selector 缩小但不能扩大 exact inputs。
- `quality-metrics`: 让同一文件的 current/baseline measurement、warning threshold、acceptance前 finding generation与cache identity消费相同 capability-specific file policy。
- `cli-contract`: 新增无 scanner side effect 的 `explain-config` command及其参数、输出与失败映射。

## Impact

- 影响 `src/product/config-*.ts`、semantic/editor schemas、neutral default、selection context、init、migration diagnostics和 canonical config example。
- 影响 scan inventory到 capability selector的 handoff、per-file threshold lookup与capability cache key。
- 影响 CLI routing/help、配置解释输出、docs、tests、fixtures与当前仓库 `.vibe-check/config.json` migration。
- 后续内容/安全检查 change 只能通过 Product registry 向 common check schema source增加自己的 optional closed section、neutral contribution、check IDs 与 patch metadata，不得另建 merge engine或把新 section 变成所有既有 v2 config 的 required field。
