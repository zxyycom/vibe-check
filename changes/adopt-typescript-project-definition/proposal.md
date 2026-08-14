# Proposal

本 Change 用使用者创建并拥有的单一 TypeScript Project Definition 取代当前 JSON config，先在唯一 current public-contract source 中建立它所需的 definition-facing fields，再在 package-private Bun runtime 中把 definition 归一化为 frozen policy data、public Check metadata 和 private execution bindings。

**执行入口：** 本 Change 当前可执行，下一任务是 `tasks.md` 的 `1.1`；必须连续完成 Verification 并归档后，才切换到 `establish-api-only-npm-product-boundary`。后一个 Change 在此之前保持等待。

## Why

JSON 能表达固定政策，却不能自然组合项目本地 Check functions 或 TaskPlan factories。继续扩展 JSON，或另建 command/plugin protocol，会形成第二套动态接入机制，并让 Core 承担 executable parsing 和 backend-specific configuration。

Project Definition 应统一组合 policy、Checks、gate、scheduler、reporting、cache 和 output configuration；public package API 只提供配置定义与工具运行两个操作。使用者需要定义 TypeScript 配置值并运行工具，但不需要 Product 创建文件、暴露 worker protocol 或要求调用方实现 runtime ports。

Project Definition 的固定路径、authoring/import symbols、effect paths 与 operational identifiers 必须在实现前拥有一个当前事实源。本 Change 在进入 loader 实现前建立唯一 package-private typed current public-contract source 及其 definition-facing fields，并完整交付 Project Definition runtime；后续 API-only package Change 只消费该 source 与 runtime seam，再添加 package/release fields，不反向要求本 Change 补接口或名称。

Project Definition 与 custom runner 会执行项目拥有的代码。为避免它们直接退出、挂起或污染编辑器、服务和 agent 等调用宿主，Product 在 package-private Bun worker/child-process boundary 中加载并运行这些代码；该边界提供进程故障 containment，不提供 OS permission sandbox。

## Outcome

`src/product/**` 中存在唯一 typed current public-contract source。它先拥有已确认的 unscoped `vibe-check`/MIT identity，以及 Project Definition 实施所需的 fixed discovery path、public import/export 与 operation/type identifiers、default effect paths、supported environment identifiers 和 operational dependency-binding identifiers；canonical definition example、loader、diagnostics 与后续 public entry 从该 owner 派生或接受单向一致性核对。Package candidate version、evidence-derived host matrix 与 release projection 由后续 API-only package Change 在同一 owner 中补全，不在本 Change 中使用 placeholder。

每次工具运行只选择一个 Project Definition source：explicit serializable locator、confirmed fixed discovery target、Product-owned neutral definition 或 typed disabled selection。Package-private runtime 对 selected module 至多 evaluate/normalize 一次，在 work 前验证并冻结 declarative policy、Check catalog、required `scheduler: { maxParallel }`、effect configuration 与 private direct/task bindings。

Project Definition 驱动 Checks、policy/gate、scheduler、reporting、cache 和 output。Product runtime 执行相应 effects，并通过 package-private execution seam 返回结构化领域结果、diagnostics、decision 与 effect status。旧 JSON reader/schema/init workflow 原子退出，不建立 dual read、silent fallback、public function serialization、public worker protocol 或 custom-result cache。

配置定义操作只帮助使用者定义 Product 可直接验证的同一 closed plain shape。使用者自行创建 fixed TypeScript file；missing or legacy configuration 返回 actionable diagnostic，Product 不提供 public `init`、bootstrap、scaffold、create-file 或 template/resource operation。后续 API-only package Change 负责公开该操作与工具运行操作、删除剩余 Product CLI，并形成 package candidate。

## Scope

纳入范围：

- 在 `src/product/**` 建立唯一 current public-contract source 及其 definition-facing fields，选择并固定 Project Definition 所需的 public identifiers、paths、environment 与 dependency-binding names，并建立当前消费者映射；
- explicit/fixed/neutral/disabled source selection、private Bun module loading、closed validation、single-invocation snapshot 和 typed diagnostics；
- closed plain Project Definition、built-in references、custom direct/task declarations、public metadata 与 private execution routing；
- policy/gate、Check selection、required global `scheduler: { maxParallel }`、reporting、cache 和 output authoring；
- custom Check initial selection、policy/reference inputs、applicability-time TaskPlan factory handoff 与 shared scheduler；
- process-failure containment、pre-import untrusted-project bypass、safe provenance/fingerprint 和 custom-result-cache exclusion；
- legacy JSON diagnostics、active JSON/schema/init removal，以及 docs、fixtures、repository dogfood 和 package-private execution seam 的原子迁移；
- 把 current public-contract source 与经过验证的 Project Definition/runtime seam 单向交付给 `establish-api-only-npm-product-boundary`。

非目标：构建 public package entry、candidate manifest、declarations、legal/release materials、staging、pack 或 exact-tarball acceptance；删除剩余 Product CLI；承诺 Node.js direct import；重新定义 CheckManager、RecordManager、DecisionPolicy evaluator 或 Task scheduler；增加 per-Check concurrency budget；实现 file-policy、format/security/network features、plugin marketplace、hot reload 或 custom-result cache。

## Success Criteria

- API-only package boundary 已确认 Bun host、private project-code containment、default tool effects、Project Definition 配置驱动执行，以及只公开配置定义与工具运行两个操作；工程可以在这些边界内闭合具体 identifiers，不再等待产品命名决定。
- 唯一 typed current public-contract source 已建立，definition-facing identifiers、paths、environment 与 dependency-binding names 只有一个 literal owner；Project Definition 实现和 canonical example 不维护第二份名称集合。
- Selection 在 explicit serializable locator、confirmed fixed discovery target、ungated neutral definition 或 typed disabled selection 中产生唯一 source；任何 gate 都要求成功加载 Project Definition 中的 named policy。
- Selected module 只在 package-private Bun runtime 中 evaluate/normalize 一次；任一 syntax、resolution、evaluation、export 或 validation failure 都在 work 前返回 typed diagnostic，不执行 valid subset。
- `scheduler` 是 required closed object，`maxParallel` 是 positive safe integer；Product neutral definition 与 canonical example 显式使用 `4`，归一化后的 `SchedulerPolicy.maxParallel` 是唯一 invocation-wide budget。
- Project Definition 统一配置 policy/gate、Checks、scheduler、reporting、cache 和 output；invocation input 只补充必要当次 context，不建立第二个行为 owner。
- 每个 custom declaration 解析为 foundation-owned public `CheckDefinition` 和恰好一个 private direct/task binding；function、closure、Task value、host path 与 internal protocol 不进入 public API、catalog、fingerprint 或 machine output。
- TaskPlan 只在 selection/applicability 完成后由 private factory 构造；skipped/not-applicable Check 不调用 factory，执行中不能注册 Check 或 Task。
- Typed disabled selection 在任何 project import 前跳过 project-owned executable code，并只允许 ungated neutral observation；private runtime 不被表述成权限 sandbox。
- Project Definition file 由使用者创建和拥有；Product 不提供 file creation、bootstrap、template resource 或 `init` command，missing/legacy config 只产生 actionable diagnostic。
- JSON reader/schema/init workflow、dual source、legacy fallback 和旧 fixtures/dogfood 均退出 active paths；loader、selection、binding handoff、provenance 和 migration 有完整 tests 与 owner 同步。
- `establish-api-only-npm-product-boundary` 能在本 Change 完成后直接消费 current public-contract source 与 package-private runtime seam，不需要本 Change 再恢复或修改接口。

## Affected Owners

- `docs/decisions/configuration/**` 与 `docs/decisions/product-contract/**`：single TypeScript source、configuration-driven execution、Bun host、private runtime、default effects、public surface 与 package 公共命名门禁。
- `docs/configuration.md`：Project Definition input、selection、policy/gate、global scheduler、reporting/cache/output authoring、validation、precedence 和 hard-cut migration。
- `src/product/**` 的 current public-contract source：definition-facing identifiers、fixed/default paths、environment/dependency-binding names 与下游单向消费边界。
- Package-private execution owner：project root、source locator、invocation context、typed diagnostics、effect status 与 private runtime handoff。
- `docs/architecture.md`：Product loader、package-private project-code runtime 与 public/private boundary。
- Check/Record、DecisionPolicy 和 orchestration owners：resolved catalog、bindings、policy validation、applicability、TaskPlan 与 scheduler semantics。
- `docs/output.md` 与 cache/reporting owners：default effects、safe provenance/fingerprint、atomicity、sensitive material 和 executable/private-data exclusion。
- API-only npm boundary Change：只消费本 Change 交付的 contract source 与 runtime seam，随后拥有 public entry、package projection、CLI hard cut 和 exact-tarball evidence。
- `src/product/**`、Project Definition authoring source、`docs/testing.md`、`docs/testing/cases/**`、fixtures 和 repository dogfood definition：实现与证据。
