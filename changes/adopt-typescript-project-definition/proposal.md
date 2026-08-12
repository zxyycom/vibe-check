# Proposal

本 Change 用使用者创建并拥有的单一 TypeScript Project Definition 取代当前 JSON config，并在 package-private Bun runtime 中把它归一化为 frozen policy data、public Check metadata 和 private execution bindings。

## Why

JSON 能表达固定政策，却不能自然组合项目本地 Check functions 或 TaskPlan factories。继续扩展 JSON，或另建 command/plugin protocol，会形成第二套动态接入机制，并让 Core 承担 executable parsing 和 backend-specific configuration。

Project Definition 应统一组合 policy、Checks、gate、scheduler、reporting、cache 和 output configuration；public package API 只提供配置定义与工具运行两个操作。使用者需要定义 TypeScript 配置值并运行工具，但不需要 Product 创建文件、暴露 worker protocol 或要求调用方实现 runtime ports。

Project Definition 与 custom runner 会执行项目拥有的代码。为避免它们直接退出、挂起或污染编辑器、服务和 agent 等调用宿主，Product 在 package-private Bun worker/child-process boundary 中加载并运行这些代码；该边界提供进程故障 containment，不提供 OS permission sandbox。

## Outcome

每次工具运行只选择一个 Project Definition source：explicit serializable locator、confirmed fixed discovery target、Product-owned neutral definition 或 typed disabled selection。Package-private runtime 对 selected module 至多 evaluate/normalize 一次，在 work 前验证并冻结 declarative policy、Check catalog、required `scheduler: { maxParallel }`、effect configuration 与 private direct/task bindings。

Project Definition 驱动 Checks、policy/gate、scheduler、reporting、cache 和 output。Product default runtime 执行相应 effects，并通过工具运行操作返回结构化领域结果、diagnostics、decision 与 effect status。旧 JSON reader/schema/init workflow 原子退出，不建立 dual read、silent fallback、public function serialization、public worker protocol 或 custom-result cache。

配置定义操作只帮助使用者定义 Product 可直接验证的同一 closed plain shape。使用者自行创建 fixed TypeScript file；missing or legacy configuration 返回 actionable diagnostic，Product 不提供 public `init`、bootstrap、scaffold、create-file 或 template/resource operation。

## Scope

纳入范围：

- explicit/fixed/neutral/disabled source selection、private Bun module loading、closed validation、single-invocation snapshot 和 typed diagnostics；
- closed plain Project Definition、built-in references、custom direct/task declarations、public metadata 与 private execution routing；
- policy/gate、Check selection、required global `scheduler: { maxParallel }`、reporting、cache 和 output authoring；
- custom Check initial selection、policy/reference inputs、applicability-time TaskPlan factory handoff 与 shared scheduler；
- process-failure containment、pre-import untrusted-project bypass、safe provenance/fingerprint 和 custom-result-cache exclusion；
- legacy JSON diagnostics、active JSON/schema/init removal，以及 docs、fixtures、dogfood 和 public package API 的原子迁移；
- fixed path、public imports/symbols、default effect paths 与 operational identifiers 对 current public-contract source 的消费。

非目标：选择具体 package/API/path/environment strings；公开 bootstrap/init、template/resource、worker/process entry 或 IPC protocol；支持 Node.js direct import；重新定义 CheckManager、RecordManager、DecisionPolicy evaluator 或 Task scheduler；增加 per-Check concurrency budget；实现 file-policy、format/security/network features、plugin marketplace、hot reload 或 custom-result cache。

## Success Criteria

- 上游 API-only package boundary 已确认 Bun host、private project-code containment、default tool effects、Project Definition 配置驱动执行，以及只公开配置定义与工具运行两个操作。
- Selection 在 explicit serializable locator、confirmed fixed discovery target、ungated neutral definition 或 typed disabled selection 中产生唯一 source；任何 gate 都要求成功加载 Project Definition 中的 named policy。
- Selected module 只在 package-private Bun runtime 中 evaluate/normalize 一次；任一 syntax、resolution、evaluation、export 或 validation failure 都在 work 前返回 typed diagnostic，不执行 valid subset。
- `scheduler` 是 required closed object，`maxParallel` 是 positive safe integer；Product neutral definition 与 canonical example 显式使用 `4`，归一化后的 `SchedulerPolicy.maxParallel` 是唯一 invocation-wide budget。
- Project Definition 统一配置 policy/gate、Checks、scheduler、reporting、cache 和 output；invocation input 只补充必要当次 context，不建立第二个行为 owner。
- 每个 custom declaration 解析为 foundation-owned public `CheckDefinition` 和恰好一个 private direct/task binding；function、closure、Task value、host path 与 internal protocol 不进入 public API、catalog、fingerprint 或 machine output。
- TaskPlan 只在 selection/applicability 完成后由 private factory 构造；skipped/not-applicable Check 不调用 factory，执行中不能注册 Check 或 Task。
- Typed disabled selection 在任何 project import 前跳过 project-owned executable code，并只允许 ungated neutral observation；private runtime 不被表述成权限 sandbox。
- Project Definition file 由使用者创建和拥有；Product 不提供 file creation、bootstrap、template resource 或 `init` command，missing/legacy config 只产生 actionable diagnostic。
- JSON reader/schema/init workflow、dual source、legacy fallback 和旧 fixtures/dogfood 均退出 active paths；loader、selection、binding handoff、provenance 和 migration 有完整 tests 与 owner 同步。

## Affected Owners

- `docs/decisions/configuration/**` 与 `docs/decisions/product-contract/**`：single TypeScript source、configuration-driven execution、Bun host、private runtime、default effects、public surface 与 package 公共命名门禁。
- `docs/configuration.md`：Project Definition input、selection、policy/gate、global scheduler、reporting/cache/output authoring、validation、precedence 和 hard-cut migration。
- Public package API owner：project root、source locator、invocation context、typed diagnostics、effect status 与 private runtime handoff。
- `docs/architecture.md`：Product loader、package-private project-code runtime 与 public/private boundary。
- Check/Record、DecisionPolicy 和 orchestration owners：resolved catalog、bindings、policy validation、applicability、TaskPlan 与 scheduler semantics。
- `docs/output.md` 与 cache/reporting owners：default effects、safe provenance/fingerprint、atomicity、sensitive material 和 executable/private-data exclusion。
- API-only npm boundary Change 与 current public-contract source：fixed discovery path、imports/exports、public symbols、effect paths 与 operational identifiers。
- `src/product/**`、Project Definition authoring source、`docs/testing.md`、`docs/testing/cases/**`、fixtures 和 repository dogfood definition：实现与证据。
