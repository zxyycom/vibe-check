## Context

当前 parser 手工声明 `project-root`、`--format` 和 `--config`，scan pipeline 只归一化 project/config path，`ScanRequest` 中的 config path 除报告元数据外不影响扫描。架构已经把配置数据结构、默认值、合并和配置诊断交给共享 Config owner，因此缺口不是新增 CLI surface，而是建立从原始来源到 Vibe Check-owned resolved config 的边界。

目标仓库当前固定在 commit [`1b739a3698f57e8a692089aaa0bc9edab0c3b0fb`](https://github.com/zxyycom/cli-config-resolution/commit/1b739a3698f57e8a692089aaa0bc9edab0c3b0fb)。已核对的 public source 包括：

- core facade 暴露 canonical `FieldDefSet`、`Resolver`、diagnostics、provenance 和 materialization：https://github.com/zxyycom/cli-config-resolution/blob/1b739a3698f57e8a692089aaa0bc9edab0c3b0fb/crates/cli-config-resolution/src/lib.rs
- Clap companion 通过 `augment_command` 注册声明过的 flag，并由 `extract_cli` 只提取 command-line explicit value：https://github.com/zxyycom/cli-config-resolution/blob/1b739a3698f57e8a692089aaa0bc9edab0c3b0fb/crates/cli-config-resolution-clap/src/lib.rs
- serde companion 从既有 `serde_json::Value` 提取声明过的 config path，但不负责文件加载或未知字段拒绝：https://github.com/zxyycom/cli-config-resolution/blob/1b739a3698f57e8a692089aaa0bc9edab0c3b0fb/crates/cli-config-resolution-serde/src/lib.rs
- canonical enum pattern 使用 `FieldStringEnum`、`FieldValidation::string_enum` 和 static default：https://github.com/zxyycom/cli-config-resolution/blob/1b739a3698f57e8a692089aaa0bc9edab0c3b0fb/crates/cli-config-resolution/tests/canonical_core.rs

Vibe Check 与目标 workspace 均使用 Rust 2021、`clap 4.5.40` 和 `serde_json 1.0`；根 workspace 与 `crates/vibe-check` 已直接声明 `serde_json`。显式 JSON 配置可直接形成 serde companion 所需的 `serde_json::Value`，无需新增格式 parser 或中间转换层。

相邻的 Docnav Rust CLI 已采用同一 submodule / workspace exclude / path dependency 布局，并使用“读取 JSON object → metadata-derived key registry 返回首个结构问题 → `extract_config` / `Resolver` → 应用自有 resolved type”的边界。Vibe Check 只复用这条最小路径，不引入 Docnav 的多级配置发现、配置命令或 adapter 参数复杂度。

## Goals / Non-Goals

**Goals:**

- 用一个 canonical field declaration 定义 output format 的 identity、CLI/env/config locator、枚举约束和 static default。
- 支持 `--format`、`VIBE_CHECK_FORMAT`、显式 JSON `output.format` 和默认 `human` 的 deterministic resolution。
- 建立严格 JSON 边界、typed materialization、Vibe Check-owned error mapping 和 scanner execution gate。
- 保持现有 command、路径、help/version 快路径与 flag discoverability、输出模式、stdout/stderr 和退出码兼容。
- 形成可增量增加其它配置字段的 Config owner，而不提前开放阈值或 scan scope 配置。

**Non-Goals:**

- 不实现隐式 project/user config discovery。
- 不配置 include/exclude/generated、warning threshold、duplicate/structural scanner profile、accepted/suppressed warning 或 gate policy。
- 不把 `project-root`、`--config`、help 或 version 建模为 resolver field。
- 不改变 report schema、人读 report、scanner behavior 或 gate semantics。
- `serde_json` parser behavior 和 generated Clap help 构成本 change 的默认边界；不定义配置版本/schema、多错误聚合或 help decoration。
- 不修改目标仓库 API，也不处理其发布、版本或许可证治理。

## Decisions

### Decision 1: 使用固定 submodule 与 workspace path dependency

把目标仓库加入 `subrepos/cli-config-resolution`，由 Git submodule 固定到已审计 commit；根 workspace 排除 nested workspace 的五个 crate，并通过 workspace path dependency 暴露本 change 实际使用的 core、Clap、serde 和 typed-fields package。该方式与本仓库已有 toolkit submodule 以及 Docnav 的同仓库消费方式一致，能同时支持可复现 checkout 和本地跨仓调试。

备选 Cargo git dependency 会减少 `.gitmodules` 配置，但会让同仓多 package 的本地开发与统一 commit 更新更间接；等待 crates.io release 不符合本 change 只判断代码接入的目标。

### Decision 2: Config owner 持有唯一 canonical output-format declaration

新增 Vibe Check Config 实现归属，以 `FieldDefs` 或等价的单一 `FieldDefSet` 声明 output format：

- field identity：`output_format`
- CLI locator：`--format`
- environment locator：`VIBE_CHECK_FORMAT`
- config locator：`output.format`
- validation：`FieldValidation::string_enum::<OutputFormat>()`
- static default：`OutputFormat::Human`
- merge strategy：默认 `Replace`

`OutputFormat` 实现 `FieldStringEnum`，其 `variants()` / `as_str()` 成为 `human|json` 的 enum owner。parser、config loader 和 error mapping 不再各自维护另一份 accepted-value 列表。

备选保留手写 `format_arg` 并仅在解析后构造 candidate 会继续复制 flag、enum 和 default metadata，不能实现目标仓库承诺的 canonical declaration。

### Decision 3: 固定显式来源顺序并忽略非显式 Clap default

Config owner 使用稳定 priority 常量：explicit config `100`、environment `200`、explicit CLI `300`；static default 由 canonical field 自动提供。`Resolver` 的高数值优先和相同 priority 后注册优先语义保持在 dependency boundary 内，Vibe Check 测试只证明本项目声明的顺序。

Clap command 不为 canonical `--format` 再设置 parser default；`extract_cli` 只把 `ValueSource::CommandLine` 建模为 CLI candidate，因此省略 flag 时不会用 Clap default 错误覆盖 env/config。无任何显式来源时由 static default 产生 `human`。Scan help 只保持 `--format` / `--config` 可发现，不额外恢复手写 parser 的 default、possible-values annotation 或精确文案。

### Decision 4: CLI syntax/bootstrap 与配置 resolution 分阶段但只解析 argv 一次

`scan` command 保留原生 positional `project-root` 和 bootstrap `--config`，再由 `augment_command` 添加 canonical `--format`。meta command 的现有 help/version 快路径保持在配置加载之前。普通 scan 的阶段为：

1. Clap 解析 command、positional、bootstrap option 和 canonical flag。
2. 基于启动 cwd 归一化 project root 与显式 config path。
3. Config owner 加载显式 JSON、读取声明过的环境变量、从 `ArgMatches` 提取 explicit CLI source。
4. 按 config、env、CLI 的稳定 registration order 调用 `Resolver::resolve` 并 typed-materialize。
5. 把 Vibe Check-owned resolved config 保留在 scan pipeline context；将 output format 直接交给既有 output dispatch，并用保持原语义的 `ScanRequest` 启动 scanner execution。

`--config` 不进入 resolver，因为必须先确定它才能创建 config source；`project-root` 仍是调用定位信息，不是可合并配置字段。

### Decision 5: 显式 JSON loader 负责文件与结构校验

Config owner 使用 `read_to_string` 与现有 `serde_json` 把显式文件解析为顶层 object。由于 serde companion 只提取声明过的 path，Vibe Check 在 extraction 前从 canonical config metadata 构造最小 key registry，用于返回首个 unknown-key 或 non-object-intermediate 问题。

本 change 支持的配置形状为：

```json
{
  "output": {
    "format": "json"
  }
}
```

处理顺序固定为：

1. 省略 `--config` 时不读取文件；显式 path 的读取、UTF-8 或 JSON 失败直接返回 configuration error。
2. 顶层必须是 object；`{}` 和缺少 `output.format` 合法。
3. Key registry 拒绝首个 unknown key 或 non-object intermediate；declared leaf value 不在结构层重复校验。
4. Serde companion 提取 leaf candidate，resolver 统一处理 value kind、enum、precedence 和 overridden trace。

文件内容始终按 JSON 解析，扩展名不选择 parser；上述步骤未定义的 parser edge behavior 沿用 `serde_json`。

### Decision 6: Dependency 类型止于 Config boundary

Config owner 输出 Vibe Check-owned `ResolvedScanConfig`，首个字段为 `OutputFormat`。该值保留在 `ScanPipelineContext` 并直接交给 output dispatch；`ScanRequest` 继续只携带 project root 与 config path 元数据。Dependency-owned resolution、identity、typed value、provenance 和 diagnostic 类型只在 Config boundary 内使用。

### Decision 7: 所有输入/config failure 继续统一映射为退出码 2

CLI syntax、path、JSON structure、selected candidate、resolution 和 materialization failure 都映射为 user/config error：scanner execution 前退出 `2`，stderr 至少包含一条可行动 diagnostic，stdout 为空。Lower invalid candidate 被合法高优先级 `Replace` value 覆盖时不阻塞。诊断契约不包含多错误聚合、排序或精确文案。

显式 `--format` 继续只接受 `human|json`。Help/version 在配置读取前返回，因此即使 environment 无效也成功退出 `0`。

### Decision 8: 验证分层证明 dependency 事实、Config 语义和真实 CLI 契约

验证分三层：

1. Dependency characterization 证明 pinned commit 的 augmentation、source extraction、enum/default、precedence 和 invalid-candidate 语义；失败时先修订 design。
2. Config 单元测试证明 JSON structure、source precedence、default、diagnostic mapping 和 owned boundary。
3. 真实 binary 测试用 checked-in fixtures 证明 output selection、override、failure、meta command、stream 和 exit-code contract，并隔离 `VIBE_CHECK_FORMAT`。

测试同步 case 账本与唯一 `@case` 标记；最终运行 workspace full profile。

## Risks / Trade-offs

- [Trade-off] `augment_command` 不保留手写 arg 的 default / possible-values help annotation。→ 保持 `--format` / `--config` 可发现、运行时 accepted values、默认值、meta behavior、通道和退出码；不为展示细节增加 wrapper decoration。
- [Risk] 严格解析会让过去“存在但被忽略”的任意 config 内容变成错误。→ 当前没有配置内容 owner；本 change 新增 owner、只读取显式文件，并提供 checked-in 合法示例与 field/locator diagnostic。
- [Risk] 宿主环境中的 `VIBE_CHECK_FORMAT` 可能让测试或普通调用出现非预期 mode。→ 环境变量成为明文 contract；测试 helper 默认移除它，只有目标 case 显式注入。
- [Risk] unknown-key registry 与 extractor metadata 漂移。→ registry 必须从同一 `FieldDefSet.processing_metadata(config)` 构造，不维护第二份 key 清单。
- [Risk] submodule 未初始化会导致 Cargo path dependency 缺失。→ 更新新 checkout 文档，验证 `git submodule update --init --recursive` 同时准备 toolkit 和 Rust dependency，并让 verifier/preflight 给出明确缺失路径。
- [Trade-off] 本 change 只接入 output format，dependency 引入相对行为增量较大。→ 该切片完整覆盖 CLI/env/JSON/default、strict validation 和 error mapping，后续字段可在已验证 owner 中 additive 扩展。

## Migration Plan

1. 加入固定 submodule 与 workspace exclude/path dependencies，复用现有 `serde_json`，并更新 checkout 初始化说明。
2. 在应用逻辑接入前完成 dependency characterization；失败则停在依赖层并修订 artifacts。
3. 新增 canonical definitions、最小 JSON loader / metadata key registry、source extraction、resolver、typed materialization 和 Vibe Check error mapping。
4. 将 `--format` 注册/提取切换到 canonical declaration，保留 positional、bootstrap config 和 meta command flow。
5. 把 resolved output format 留在 scan pipeline context 并交给现有 output dispatch，保持 `ScanRequest`、report 字段与输出 schema 不变。
6. 同步 owner docs、主 spec、checked-in fixture、case 账本和验证脚本，运行 full verification。

回滚时恢复手写 `format_arg` / default、移除 Config resolution 调用和 submodule path dependencies；现有显式 `--format` 仍提供等价行为。若已发布新 config/env surface，降级版本将忽略它们，因此回滚说明必须要求调用方改用显式 `--format`。
