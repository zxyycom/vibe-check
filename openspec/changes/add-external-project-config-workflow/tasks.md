执行契约：0.1-0.6 已完成；0.7 是 implementation gate。只有前置
`decouple-project-config-from-scanner-tools` 完成实现与验证，并用其最终语义 schema 重新核对本
change 后，才能从 section 1 开始。其后按 section 顺序推进。每个 checkbox 只有在对应
implementation、focused proof 和必要 owner/Case 同步都完成后才能勾选。`specs/**` 定义目标
行为，task 文本只定义工作和证据；两者冲突时先修正 artifact，不得让 task 隐式改写 contract。

修改任何 test 正文或实体前，先运行 `bun run test-evidence:check`，再用 `topics` / `list` /
`show` 恢复相关 Case；修改后先跑最窄目标测试，再运行完整 check。不得为 planned behavior
预建没有当前测试实体的 Case。

## 0. Implementation Readiness

- [x] 0.1 审计 proposal、design、deltas、当前 explicit-config implementation、owner docs
  与 external fixture；确认 existing exact-input/config-path behavior 已实现并归档。
- [x] 0.2 选择单一 mixed repository-neutral starter，排除 preset taxonomy、language
  detection、network access 和 package-script mutation。
- [x] 0.3 为 selected config、public CLI field overrides 与 internal dependency resolution
  划定 owner、precedence 和 provenance 边界；确认 external workflow 不拥有 scanner command、
  args 或 operational override contract。
- [x] 0.4 审计 current `QualityConfig`、runtime schema、environment overrides、starter 与 fixture
  的 tool coupling；确认不能通过只隐藏 `tools` object 得到完整语义 config，并把完整迁移拆到
  `decouple-project-config-from-scanner-tools`。
- [x] 0.5 审计 Bun native comment-capable JSON parser、现有 strict parser、`typebox` schema
  pattern 与 generation workflow；闭合 user-facing `.vibe-check/config.json`、comments/trailing
  commas、optional `$schema`、runtime schema ownership、editor schema、strict JSON compatibility
  和 handled-failure all-or-nothing creation。
- [x] 0.6 按 `ai-ready-docs` 与 `docs/coding-style.md` 重构 change artifacts：固定 artifact
  权威关系、术语、implementation owner、boundary types、数据流、failure model、safe cleanup、
  verification layers 和无未决问题状态；重跑 OpenSpec/文档 audit。
- [ ] 0.7 完成并验证 `decouple-project-config-from-scanner-tools`，同步 Configuration owner、
  runtime schema、fixtures 和 Cases；随后把本 change rebase 到其最终 semantic config contract，
  定向确认 starter、schema、help、provenance 和 dogfood config 均不暴露 scanner identity、command
  或 args。

## 1. Product Config Boundary, Selection and Provenance

- [ ] 1.1 在修改 config/CLI tests 前运行完整 test-evidence check，查询当前
  scan-configuration、CLI、external fixture 和 dogfood Cases，记录需要保留或扩展的证明目的。
- [ ] 1.2 在 Product Config owner 定义固定 Vibe Check directory/file constants、
  `ConfigDocument`、readonly `SelectedConfig` 和 closed source union；`SelectedConfig` 只携带
  semantic config、source、normalized path 与 version，raw document input 保持 `unknown`，不把
  这些类型放入通用 constants bucket。
- [ ] 1.3 复用前置 change 的单一 semantic runtime schema source，组合只额外允许 optional
  `$schema` metadata 的 closed document schema；不得复制 field tree，也不得在 document/editor
  schema 中引入 scanner identity、command、args 或 operational override。
- [ ] 1.4 把 config loader 收敛为一个 content-based UTF-8 Vibe Check JSON path：内部使用
  `Bun.JSONC.parse` 接受 line/block comments 与 trailing commas，同时接受 strict JSON；file
  extension 不切换 parser，optional `$schema` 不进入 resolved config。
- [ ] 1.5 实现 explicit-or-discovered selection：显式相对 path 沿用 normalized project-root
  semantics；省略 flag 时只选择 `.vibe-check/config.json`；不读取 legacy root file、parent、
  launch cwd、worktree、home 或 sibling schema，也不 merge 两份 document。
- [ ] 1.6 File validation 后只应用已声明的 public config-field CLI overrides（当前为
  `--top-n` / `--artifact-dir`）；empty/unset input 不 override。Dependency boundary 从 resolved
  semantic config 单独生成 execution snapshot，任何 internal operational override 不参与 config
  selection、merge 或 public provenance。
- [ ] 1.7 建立一套受控 config-workflow failure model，把 selection、regular-file、read、UTF-8、
  config syntax、schema、semantic 和 public CLI override failures 在 CLI 边界映射为
  path/field-aware stderr 与 exit `3`；不回显 environment values，不启动
  banner/scanner/baseline/cache/artifacts。
- [ ] 1.8 在 dependency resolution 前输出 source、normalized absolute path 与 version；只把一个
  resolved `SelectedConfig.config` 交给 current、baseline 和 Git-failure fallback，不改变 machine
  v1，不输出 scanner、command、args 或 internal override provenance，也不让 Core 按 source
  分支。
- [ ] 1.9 增加 focused schema/loader/selection/precedence/error tests，证明 semantic schema
  composition、strict JSON compatibility、comments/trailing commas、unknown/missing fields、invalid
  timezone、explicit priority、launch-cwd independence、missing config、tool-detail rejection 和
  no-work-before-config；更新已有相关 Cases，不创建模板 Case。

## 2. Initialization Workflow

- [ ] 2.1 增加 top-level `init [project-root]` routing、root/scan/init help 和 operation-specific
  runtime boundary；`init` 不调用 scan core，unknown/malformed invocations 保持受控 exit。
- [ ] 2.2 由 Product Config owner 提供 complete、repository-neutral semantic starter value，
  包含前置 contract 声明的 version、scope、checks、report 与 artifact/cache settings；starter
  不包含 scanner identity、command、args 或 platform-specific executable。
- [ ] 2.3 从 starter value deterministic 生成 UTF-8/LF/two-space/trailing-newline
  `.vibe-check/config.json`，固定相对 `$schema` link，只在 scope、checks、thresholds、report、
  artifact/cache 和 precedence section 添加会帮助填写的 comments。
- [ ] 2.4 从 task 1.3 的同一 runtime schema source deterministic 生成 JSON Schema 2020-12
  `.vibe-check/config.schema.json`；增加 canonical generation drift 和 independent schema
  compile/validation proofs，禁止 runtime loader 读取 sibling schema。
- [ ] 2.5 在任何 filesystem mutation 前生成并自校验两份 bytes；对最终 `.vibe-check` 使用
  non-recursive exclusive directory creation，再 exclusive 写入两个固定 files。Existing
  file/dir/symlink、directory-create race 或 handled write failure 不得覆盖内容；cleanup 只处理本
  invocation 创建的精确 paths，不使用 recursive delete 或通配符。
- [ ] 2.6 对 missing/non-directory/unwritable roots、existing Vibe Check directory、write/cleanup
  failure 返回 stage/path-aware exit `3`；成功时打印两个 created absolute paths 与精确下一步
  scan command，不检查语言/scanner、不联网、不安装依赖、不修改 package scripts。
- [ ] 2.7 增加 init focused tests，证明跨 host platform 的 deterministic bytes、
  repository-neutral semantic content、runtime round-trip、tool-detail absence、existing-entry byte
  preservation、concurrent exclusive-create loser、injected first/second write failure cleanup、
  unexpected residual refusal 和零 scan invocation；同步相关 semantic Cases。

## 3. Dogfood Migration and Formal Acceptance

- [ ] 3.1 把当前 repository-specific complete semantic config values 迁入 checked-in
  `<repo-root>/.vibe-check/config.json`，从 runtime source 生成对应 `config.schema.json`；不包含
  scanner identity、command、args、checkout absolute path，也不把 starter neutral scope/report
  values 误作 dogfood values。
- [ ] 3.2 让 `scripts/quality/scan.ts` 与所有 `quality:*` package entries 显式传入 repository
  root 和 `--config .vibe-check/config.json`；wrapper 继续只做单向 pass-through，不解析、merge、
  生成或修补 config。
- [ ] 3.3 扩展现有 external fixture temporary-copy acceptance，不新建平行 project fixture；
  覆盖 init 后 Vibe Check-directory discovery、JSON comments/trailing commas、strict JSON explicit
  compatibility、explicit priority、missing config、existing-directory preservation、handled
  partial-set cleanup 和 launch-cwd independence。
- [ ] 3.4 在 formal entry 观察 selected source/path/version、one resolved semantic config 与
  no-dependency-work-before-config；证明相同 document 经 explicit/discovered source 产生相同 scope
  和 scanner exact inputs，但 public output 不暴露 dependency implementation details。
- [ ] 3.5 增加 `$schema` relative link、generated schema independent validation、generation
  drift，以及 sibling schema missing/modified/invalid 不改变 runtime authority 的 acceptance。
- [ ] 3.6 增加 dogfood acceptance，证明 checked-in semantic config/schema 与
  quick/full/default/gate wrapper profile、gate 和 process outcomes 继续 pass-through；dependency
  executable selection 仍由独立 internal boundary 负责，wrapper 与 project config 都不改写它。
- [ ] 3.7 更新所有 changed/new test entities 的 semantic Cases，并用 owner contract 描述
  `Proves`；完成最窄 tests 后运行完整 `bun run test-evidence:check`，修复全树实体闭合。

## 4. Owners and Delivery Verification

- [ ] 4.1 更新 CLI、Configuration、Scan Scope、Architecture、Testing、Script Tooling 与
  navigation owners，记录 Vibe Check-directory discovery、comment-capable JSON content contract、
  runtime/editor schema boundary、semantic/dependency separation、safe init boundary、precedence、
  provenance、dogfood path 和 machine boundary；owner docs 不复制 OpenSpec 历史状态。
- [ ] 4.2 运行最窄 config schema/loader/init/CLI/formal-entry/dogfood tests，再运行完整
  `bun run test:product`；确认 stderr/stdout、exit 和 side-effect assertions 均来自同一失败
  model。
- [ ] 4.3 运行 `bun run typecheck:product`、`bun run lint:product`、
  `bun run typecheck:scripts`、`bun run lint:scripts` 和 product import-boundary checks；证明
  `src/product/**` 不反向导入 `scripts/**`，且未新增 dependency。
- [ ] 4.4 从各 project root 外重放 init、commented discovered scan、strict JSON explicit scan、
  missing/invalid-config failure、schema-independent scan 和 dogfood wrapper smoke；保留命令、
  exit、关键 console 与 filesystem evidence。
- [ ] 4.5 再运行完整 `bun run test-evidence:check`，确认 changed proof targets、Case owners 与
  当前实体集合严格闭合。
- [ ] 4.6 运行 `bun run validate` 与
  `bun run verify:vibe-check-workspace:required`。
- [ ] 4.7 运行 OpenSpec strict validation、`git diff --check` 与定向搜索，证明未引入 root
  `vibe-check.config.json` discovery、`JSON.parse`-only config path、runtime-loaded sibling schema、
  implicit `DEFAULT_CONFIG` fallback、wrapper-owned config logic、parent discovery、machine-v1
  provenance fields、recursive init cleanup、public scanner/command/args fields 或第二套 semantic
  schema owner。
