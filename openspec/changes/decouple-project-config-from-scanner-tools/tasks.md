本 task list 把 semantic config 解耦分成 readiness、schema、dependency、consumer、fixture/docs 与验证阶段；0.x 未全部完成前禁止执行任何 1.x 及以后实现任务。

## 0. Blocking Readiness and Approval

- [x] 0.1 重新运行 `openspec list --json`、`openspec list --specs --json` 与 `bun run decisions:list`，复核 current Configuration/Architecture/Scanner Dependencies/Quality Metrics owners、`QualityConfig` consumers、dependent changes `add-external-project-config-workflow` / `port-lizard-function-metrics-to-typescript` 和 deferred Lizard priority；事实变化时先更新本 change artifacts，禁止直接实现。
- [x] 0.2 用户确认 exact `version = "1"` contract discriminator、semantic `checkId` 并移除 public legacy matcher，以及 legacy tool-shaped config fail-fast hard cut；确认结果已同步 proposal/design/specs/tasks 和长期 decisions，无未决 public-contract 选择。
- [x] 0.3 用 `QualityConfig`、scope/warning/cache consumers 与 scanner obligations 完成 field-by-field common-denominator audit，确认 `checks.files/functions/duplication` 只含稳定 product semantics；characterize `formatByCodeArea` 的 current filter behavior，并把 target 固定为 adapter 对 exact inputs 省略 public format override，而不是建立 generic format abstraction。审计结果已回写 design、specs 和 implementation tasks。
- [x] 0.4 Rebase `add-external-project-config-workflow` artifacts：明确本 change 是 implementation prerequisite；只使用 `.vibe-check/config.json`、comment-capable JSON 和 composed `$schema` metadata；直接消费 semantic runtime schema，不复制 field tree、不输出 applied dependency override provenance。对两个 changes 运行 strict validation。
- [x] 0.5 Rebase deferred `port-lizard-function-metrics-to-typescript` artifacts：保留已记录延期优先级，把未来 config work 限制为 internal dependency/backend rebase，删除其修改 public project schema/tool-named thresholds 的计划；运行 strict validation，且不得借此启动 port。
- [x] 0.6 在 0.1-0.5 完成后执行阻塞级 artifact audit：proposal/design/specs/tasks 围绕“public semantic config + internal dependency snapshot”；补齐 existing `duplicate-scanning` capability；当前事实和目标状态可区分；未把 planning artifacts 写成已实现；未在本 change 中复制 discovery/init/comment parser；readiness evidence 未重新引入未确认的 public-contract 选择。三个 active changes 均通过 OpenSpec strict validation。
- [x] 0.7 在任何 test entity/body 或 Case 修改前使用 `test-evidence-review`，运行 `bun run test-evidence:check` 并查询 `scan-configuration`、`scanner-adapters`、`scan-scope`、`quality-runtime`、`warning-generation` 与 `repository-tooling` 的相关 Cases；检查已通过。Implementation 优先复用这些 Cases；只有新 test 形成独立 owner requirement 或可观察结果时才新增 Case，planning 不为尚未存在的 test entity 创建 Case。

## 1. Semantic Runtime Schema and Config Boundary

- [x] 1.1 在 Product Config owner 内建立唯一 `SemanticProjectConfigV1` runtime schema source 和 schema-derived TypeScript type；按已确认 contract 定义 closed root、code areas、`checks.files/functions/duplication`、accepted warnings、report、artifact/cache 与 version constraints，不新增 dependency。
- [x] 1.2 对 runtime schema 无法完整表达的语义增加 path-aware post-validation：time zone、`minimumTokensByCodeArea` key 与 `codeAreas` reference 及其它 task 0.3 已确认关系；raw input 保持 `unknown`，成功后返回 detached value。本解耦保持 current finite-number acceptance，不自行增加 positive/integer constraints。
- [x] 1.3 建立 semantic document 到 readonly resolved domain config 的显式 mapper，并只在 CLI boundary 应用 `--top-n` / `--artifact-dir`；Core、baseline 与 fallback 得到同一个 invocation-owned value，不 partial merge、不修改 raw input。
- [x] 1.4 把 current `DEFAULT_CONFIG` 拆为 repository-specific built-in semantic defaults 和独立 dependency defaults；证明 built-in semantic value 通过同一 runtime schema/post-validation，且其 public tree 不含 scanner identity 或 process settings。
- [x] 1.5 按 task 0.2 的已确认 hard-cut migration 实现 legacy-shape boundary；识别旧 top-level fields，返回 path/version/semantic mapping/operational landing guidance，且在 banner、scanner、baseline 与 artifacts 前 exit `3`，不读取或执行旧 command/args。
- [x] 1.6 暴露给 dependent external workflow 的 schema composition/generation seam：从同一 semantic source 派生 editor-schema projection 和 type，不拥有 filename/comment grammar；增加 independent JSON Schema 2020-12 compile、canonical validation 与 generation-drift proof。
- [x] 1.7 增加最窄 Config tests，证明 complete semantic input、closed fields、approved version、detached mapping、cross-field validation、legacy migration failure、CLI override precedence 和 schema/type/generation 一致；测试正文变更后同步相关 semantic Cases。

## 2. Product-Owned Scanner Dependency Boundary

- [x] 2.1 定义 readonly `ScannerDependencySnapshot` 与 file/function/duplication capability-specific slices；集中 built-in executable/args、host-platform resolution、availability protocol inputs 与 bounded concurrency，不把 duplicate per-path format detection 提升进 generic snapshot，也不建立 provider/plugin hierarchy。
- [x] 2.2 把当前 `VIBE_CHECK_LIZARD_CMD`、`VIBE_CHECK_SCC_CMD` / `_ARGS`、`VIBE_CHECK_JSCPD_CMD` / `_ARGS` 作为 internal operational compatibility 一次读取并严格校验；non-empty `*_CMD` string 替换 executable，unset/empty 表示无 override，executable existence 留给 eligible availability；non-empty `_ARGS` 必须是 JSON string array，unset/empty 产生空 additional-args list。全部 supplied non-empty inputs 在 eligibility 前完成 shape validation，invalid shape 使用 typed operational error / exit `2`、隐藏完整 value 且不从 project config fallback。Lizard args 固定 `-m lizard`，不新增未存在的 args override。
- [x] 2.3 先写/复用 failing characterization，再让 duplicate adapter 对 exact inputs 省略 jscpd format override，并把 bounded concurrency 迁入 dependency slice；覆盖 pure `.ts` / `.rs`、mixed-area per-extension behavior、minimum-token default/override、scope exclusion、insufficient-area no-work 与 cache identity。不能恢复 public format field 或建立无消费者的 format abstraction。
- [x] 2.4 修改 current orchestration，使 eligibility 先于 availability/invocation；只有 eligible adapter 接收 exact inputs、required semantic scan settings 与一个 dependency slice，scope/warnings/report 不接收 executable/args。
- [x] 2.5 修改 baseline orchestration，使 current 与 baseline 复用 invocation dependency snapshot 但独立计算 revision eligibility；证明 current no-input / baseline eligible、skipped/no-input 不检查 dependency availability 或启动 process（caller-supplied operational input 仍按 2.2 校验），以及 environment 不被第二次读取。
- [x] 2.6 重构 measurement/cache identities：由各 cache owner 按 capability 投影 measurement-relevant semantic settings、exact-input fingerprint 和 normalized backend identity；删除 caller-defined config version 作为唯一 invalidation，不建立 Product Config-owned 全量 fingerprint，并避免 report/acceptance text 或 sibling capability settings 进入 scanner cache。
- [x] 2.7 增加 dependency resolver、eligibility、current/baseline reuse、availability/execution/invalid-result 与 cache-focused tests；保留 shared capability result semantics 并同步相关 semantic Cases。

## 3. Semantic Consumers and Cross-Layer Mapping

- [x] 3.1 迁移 current、baseline 和 Git-failure fallback scope consumers 到同一个 resolved semantic include/exclude/generated/code-area slices；证明 explicit semantic config 不继承 built-in 或 backend-private exclusions。
- [x] 3.2 迁移 file/function/duplication warning generation 到 `checks` domain slices，保持 task 0.3 记录的 floors、changed deltas 和 allowances；current/baseline/comparison 使用相同 resolved values。
- [x] 3.3 按 task 0.2 已确认的 config identity 实现 exhaustive semantic `checkId` mapping 与 accepted-warning matching；移除 project `sourceTool` matcher，同时保持 current machine `ruleId` / `sourceTool`、channels、ordering 和 `acceptedReason` behavior。
- [x] 3.4 迁移 report、artifact/cache paths 与 metadata config version consumers；保持 report/gate/process outcome 和 current machine schema shape，不新增 config fingerprint 或 dependency override public provenance。
- [x] 3.5 删除 production public parser/type/config 中的 `lizard`、`scc`、`jscpd`、`tools`、`command`、`args` field tree；定向审计剩余 occurrences，将每处归为 internal dependency/adapter、machine diagnostic identity、test protocol material 或明确缺口。
- [x] 3.6 运行最窄 scope、warning、cache、baseline、core 和 output regression tests，证明 semantic mapping 改变 config boundary 而不改变 normalized metrics、warning/gate/completeness 和 process outcome；同步被修改 test entities 的 semantic Cases。

## 4. Fixture, Formal Entry, and Dogfood Migration

- [x] 4.1 把 canonical external project config 移动到 `fixtures/projects/configured-typescript/.vibe-check/config.json`，内容使用 approved semantic schema 并保持 strict JSON compatible；fixture public config/README 不含 scanner names、command 或 args。本 change 不实现 implicit discovery。
- [x] 4.2 更新 formal-entry fixture invocation，仍显式传入 `--config .vibe-check/config.json`，并通过 Product-owned operational override 或 typed lower-level injection 控制 scanner；证明 launch-cwd independence、scope/check/report/artifact semantics 与 deterministic repeat。
- [x] 4.3 扩展 formal-entry failure coverage：invalid semantic document / legacy shape 在 exit `3`、invalid operational override 在 exit `2`、eligible dependency unavailable 进入 failed capability，以及 no-input/skip 不检查 dependency availability 或启动 process；所有 caller-supplied operational inputs 仍在 eligibility 前校验，所有 pre-scan boundary error 均无 banner/scanner/cache/artifact side effect。
- [x] 4.4 迁移 repository dogfood 默认路径所需的 semantic values 与 dependency resolution 测试，保持现有 `quality:*` wrapper 单向调用和 profile/gate behavior；不在本 change 创建/发现 `.vibe-check/config.json`，dependent external workflow 再把相同 repository semantics materialize 为 config file。
- [x] 4.5 更新 fixture/dogfood/config tests 对应 semantic Cases；完成最窄 tests 后运行完整 `bun run test-evidence:check`，修复 current entities 与 Case catalog 的 many-to-many 闭合。

## 5. Owner Docs, Migration Guidance, and Change Handoff

- [x] 5.1 更新 Configuration owner，记录 semantic schema field owner、resolved config、approved version/migration、CLI precedence、error behavior 与 external workflow handoff；提供一个 current canonical semantic example，不保留 legacy input 作为 valid fixture。
- [x] 5.2 更新 Architecture、Scanner Dependencies、Scan Scope、Quality Metrics、CLI、Testing 与 navigation owners，并同步 `duplicate-scanning` main spec；分别记录 dependency snapshot/data flow、duplicate exact-input/format-detection boundary、scope reuse、semantic checks/acceptance、formal-entry fixture path 与验证边界；每项规则只在对应 owner 完整表达。
- [x] 5.3 写入 approved old-to-new migration table：threshold sections、accepted-warning identity、removed dependency execution settings、supported operational override 落点、无 Lizard args override、removed duplicate format filter 和 internal concurrency；说明 binary/config pair rollback，并只提供一个 canonical semantic example，不复制完整 legacy config。
- [x] 5.4 更新 public schema/example/fixture/help 定向材料，证明 user-facing config surface 没有 scanner product、command/args、parallelism 或 backend format；machine output/source identities 明确标为本 change 不修改。
- [x] 5.5 复核 `add-external-project-config-workflow` 只组合 `$schema` 和 file workflow、使用 `.vibe-check/config.json` 且无 dependency provenance；复核 deferred Lizard port 只依赖 internal boundary。两者若与 implemented facts 漂移，先更新各自 artifacts 再进入后续 implementation。

## 6. Delivery Verification

- [x] 6.1 运行最窄 Config schema/parser/mapping、dependency resolver、scope、warning、cache、baseline、fixture formal-entry 与 dogfood tests，再运行完整 `bun run test:product`；确认 failure assertions 覆盖 stderr/stdout、exit 和无 scanner/artifact side effect。
- [x] 6.2 运行 `bun run typecheck:product`、`bun run lint:product` 与 product import-boundary checks；如 implementation 触及 scripts/tests，再运行 `bun run typecheck:scripts`、`bun run lint:scripts`。证明 `src/product/**` 不导入 `scripts/**` 且未新增 dependency。
- [x] 6.3 从 fixture root 外重放 explicit `.vibe-check/config.json` scan、legacy migration failure、invalid operational override、current/baseline reuse、Git-failure fallback 与 no-input/eligible dependency cases；保存命令、exit、关键 console 和 artifact evidence。
- [x] 6.4 运行 schema generation drift、independent schema compile/canonical validation，并定向搜索 public runtime schema、config examples、fixture、Configuration docs 和 external starter contract，证明无 `lizard` / `scc` / `jscpd` / `command` / `args` / dependency concurrency / backend format filter；搜索须排除明确允许的 internal adapter、machine output 和 historical migration 说明。
- [x] 6.5 再运行完整 `bun run test-evidence:check`，确认所有 changed/new test entities、Case owners 和 `Proves` 与 current implementation 严格闭合。
- [x] 6.6 运行 `bun run validate` 与 `bun run verify:vibe-check-workspace:required`；修复 docs/schema/example/OpenSpec、dogfood 和 cross-boundary drift。
- [x] 6.7 运行本 change 及两个 dependent active changes 的 OpenSpec strict validation、`bun run decisions:check` 和 `git diff --check`；确认只在任务批准范围修改文件，0.x gate state、implementation evidence 和剩余风险可独立恢复。
