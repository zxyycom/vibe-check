## Change 状态

本 change 的 workflow planning 已完成，但 implementation 必须等待
`decouple-project-config-from-scanner-tools` 先交付最终 semantic project config。当前产品只
实现了显式、tool-coupled、完整 JSON `--config`；本文其余行为都是目标状态，不得写成已经
生效。

Lizard TypeScript port 已明确延期且不阻塞产品向工作。前置 semantic-config change 先把
public fields 与 scanner identity/command 隔离；本 change 随后只生成和选择 tool-neutral
config，因此未来 port 不再要求用户迁移 project config。

## Why

调用者省略 `--config` 时，Product CLI 当前会创建 Vibe Check 仓库专用
`DEFAULT_CONFIG`。其中包含 Vibe Check-specific include globs、code areas、report text、
artifact paths 和 dependency commands。调用者只有手写并显式选择一份较长的完整
`QualityConfig`，才能安全扫描其它项目。

缺少的产品结果不是另一种 fallback，而是一条明确的项目配置工作流：配置集中在工具目录，
可以生成、审阅和提交；注释说明填写意图，editor schema 提供字段提示；扫描只采用调用者
明确选择或项目明确拥有的配置。Vibe Check 仓库不再把自身默认值隐式借给其它项目。

## What Changes

- Formal `scan` 在省略 `--config` 时只发现
  `<project-root>/.vibe-check/config.json`；显式 `--config` 仍优先，两种来源不 merge。
- Vibe Check JSON content contract 接受 comments 与 trailing commas，并继续接受既有严格 JSON
  explicit configs；用户入口保持常规 `.json` 文件名。
- 没有 selected config 时，在 banner、scanner、baseline、cache 和 artifacts 前以 config
  error 失败，并给出 `init` 与 `--config` 两条恢复路径。
- Product CLI 新增非交互 `init [project-root]`，安全生成 commented
  `.vibe-check/config.json` 与对应 `.vibe-check/config.schema.json`。
- Product Config 复用前置 change 建立的 semantic runtime schema，同时驱动 structural
  validation 和 editor schema generation；可编辑的 sibling schema 不参与运行时验证。
- Product Config 统一 config selection、既有 CLI field overrides 和 selected-config
  provenance；底层 dependency resolution 不进入 project config precedence。
- Vibe Check 仓库提交自己的 tool-directory config/schema；所有 `quality:*` wrappers 都通过
  formal Product CLI 显式选择它。

字段级行为和 scenarios 由 `specs/**` 定义；实现归属、数据流与失败模型由 `design.md` 定义。

## Scope

### In scope

- 固定 tool-directory discovery 与 missing-config failure。
- Comment-capable JSON parsing、strict JSON compatibility、基于前置 semantic runtime schema 的
  document-schema composition 和 editor schema generation。
- Repository-neutral starter、non-overwriting initialization 和 selected-config provenance。
- 既有 `--top-n` / `--artifact-dir` CLI field precedence。
- Dogfood config migration、owner docs、formal-entry fixtures、tests 和 semantic Cases。

### Out of scope

- Partial config、deep merge、inheritance、preset、executable config module 或 remote config。
- Parent、launch-cwd、worktree、home 或 project-root legacy-file discovery。
- Project inference、language detection、dependency installation、network access、package
  distribution 或 package-script mutation。
- Scanner algorithm、threshold meaning、warning、gate、artifact filename 或 machine DTO change。
- Public semantic config field design、legacy tool-named config migration、scanner dependency
  resolution 或 operational override contract；这些由前置 change 拥有。
- Lizard TypeScript port 本身。

## Compatibility and Migration

- 前置 semantic-config change 先完成 tool-named config 的迁移；本 change 只承诺其最终 semantic
  document 的 strict JSON subset 与 comment-capable JSON 使用同一 contract。Extension 不选择 parser
  或不同语义。
- 省略 `--config` 的行为有意从 repository-specific fallback 改为 fixed discovery 或 exit `3`。
  `init` 是外部项目的迁移入口，dogfood config 在同一 revision 迁移。
- Generated starter、editor schema 和 checked-in dogfood config 不包含 scanner names、command、
  args 或 host-specific dependency paths。
- Config source/path 只进入 console/runtime context；machine-visible provenance 需要独立
  versioned output-contract change。

## Success Criteria

- 相同完整 document 通过 explicit 或 discovered path 选择时，产生相同 resolved scan scope
  和 scanner exact inputs。
- 无 config 或无效 config 的 project 在任何 scanner/artifact work 前以 exit `3` 失败，并有
  可行动诊断。
- 同一 product revision 在不同 host platform 上，`init` 生成相同的 deterministic、
  repository-neutral、可由 runtime loader 接受的 commented JSON/schema bytes。
- 已有 `.vibe-check`、并发 directory-create race 或受控中间写入失败不会覆盖既有内容；命令
  返回后不留下 Product 创建的半套 artifact。
- Composed runtime document schema 与 generated editor schema 对结构字段和约束无漂移；base
  semantic field tree 与 runtime-only checks 继续由前置 Product Config owner 承接。
- Runtime 不读取 sibling schema；删除、编辑或破坏它不会改变有效 config 的 scan 结果。
- Generated starter/schema/dogfood document 不暴露 `lizard`、`scc`、`jscpd` 或 tool
  command/args。
- Dogfood 不再依赖隐式 repository-specific fallback，wrapper 仍是单向 pass-through。
- Help、console、owner docs、fixtures、tests 和 semantic Cases 只描述一套 discovery、
  precedence 和失败边界。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `scan-configuration`：tool-directory discovery、comment-capable JSON/schema authoring、exclusive
  initialization、selection context 与 CLI field precedence。
- `cli-contract`：`init` routing 和 configuration workflow help/error mapping。
- `scan-scope`：一个 selected complete config 进入既有 normalization pipeline。
- `test-fixtures`：external onboarding、selection、failure、schema authority 与 dogfood isolation
  proofs。

## Dependencies and Impact

- 依赖已归档的 explicit-config capability，并以
  `decouple-project-config-from-scanner-tools` 的 semantic runtime schema 为 implementation
  prerequisite；不依赖 Lizard port 或 machine-output change。
- 影响 Product CLI routing、Product Config boundary、scan orchestration、help、dogfood wrapper
  args、fixtures、owner docs 和 tests。
- 不改变 scanner adapters、Core metrics model、warning/gate semantics 或 stable machine v1。
