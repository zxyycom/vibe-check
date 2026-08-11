# Proposal

本 Change 计划用 Bun 托管的 TypeScript Project Definition 取代当前 JSON config，并把结构化 authoring 解析为冻结政策数据、公共 Check metadata 与私有 execution bindings；在进入 implementation 前，proposal 仍可随同一目标的事实核对而修订。

## Why

JSON 能表达固定政策，却不能自然组合项目本地 Check functions 或 TaskPlan factories。继续扩展 JSON 或另建 command/plugin protocol 会形成第二套动态接入机制，并让 Core 重新承担 executable parsing 和 backend-specific 配置。Project Definition 应只负责受信任 authoring 与 source selection，Check/Record Core 和 execution orchestration 继续拥有 resolved runtime contract。

## Outcome

`<project-root>/.vibe-check/config.ts` 成为固定 Project Definition source，显式 config 只选择受支持的 TypeScript module。Bun 每次 CLI invocation 至多加载所选 module 一次；Product 随后归一化并冻结 policy data、closed `scheduler: { maxParallel }`、built-in refs、custom public metadata、schedule metadata 与对应 private direct/task bindings。旧 JSON/schema workflow hard-cut 退出，不建立双读、静默 fallback、函数序列化或 custom-result cache。

## Scope

纳入范围：

- explicit/fixed/neutral/disabled source selection、Bun module loading、closed runtime validation、single-invocation snapshot 和 typed config diagnostics；
- plain structured default export、optional package identity helpers/types、built-in references、custom direct/task declarations 及 public/private routing；definition module 可按 Bun project resolution 使用 bare/local imports；
- custom Check initial selection、policy/reference inputs、required global `scheduler: { maxParallel }` authoring、applicability-time TaskPlan factory handoff；
- trusted same-process execution、`--no-project-definition`、static help、dynamic policy diagnostic、safe provenance/fingerprint 和 cache exclusion；
- `init` 的 deterministic import-free `.vibe-check/config.ts` starter、legacy JSON diagnostic，以及 config/CLI/output/docs/fixtures/dogfood 的原子迁移。

非目标：重新定义 CheckManager、RecordManager、DecisionPolicy evaluator 或 Task scheduler；增加 per-Check / feature-specific concurrency budget；实现 file-policy、format/security/network features；generic command runner、plugin marketplace、hot reload；sandbox、public cancellation、timeout 或 hard termination；为 custom executable results 建立 cache。

## Success Criteria

- Selection 使用 explicit `.ts` module、固定 `.vibe-check/config.ts`、ungated neutral definition 或显式 disabled path；任一 gate 要求成功加载 Project Definition 中的 named policy。
- Plain structured export 与 optional `vibe-check/project` helpers 归一化为相同 closed input；module 在一次 invocation 中只 evaluate/normalize 一次，任何 pre-work failure 不运行 valid subset。
- `scheduler` 是 required closed object，`maxParallel` 必须是 positive safe integer；Product neutral definition 与 canonical `init` starter 都显式使用 `4`。归一化后的 `SchedulerPolicy.maxParallel` 是唯一 invocation-wide scheduler budget，Check declarations 不能另建或放大并发预算。
- Custom declaration 解析为 foundation-owned public `CheckDefinition` 和恰好一个 private direct/task binding；functions、imports、closures、Task values 与 host paths 不进入 catalog、fingerprint 或 machine output。
- TaskPlan 只在 selection/applicability 完成后由 private factory 构造；skipped/not-applicable Check 不调用 factory，执行中不能注册 Check 或 Task。
- `--no-project-definition` 在 import 前完全跳过 project code且仅允许 ungated neutral observation；帮助和文档不暗示同进程代码受到 sandbox、timeout 或权限隔离。
- `init` 不 evaluate module，生成 import-free、可重复的 `.vibe-check/config.ts`；JSON reader/schema/sibling editor workflow、dual source、legacy fallback 和旧 fixtures/dogfood 均退出 active paths。
- 目标 loader、selection、trust、binding handoff、provenance 和 migration 具有完整测试与 owner 同步，项目规定验证通过。

## Affected Owners

- `docs/configuration.md`：Project Definition input、global scheduler authoring/default、selection、neutral definition、validation、precedence、init 和 hard-cut migration。
- `docs/cli.md`：`--config`、`--no-project-definition`、static help、gate prerequisite、diagnostics 和 exit mapping。
- `docs/architecture.md`：Product loader、trusted project-code boundary 与 public/private handoff。
- Check/Record、DecisionPolicy 和 orchestration 的当前稳定 owners：resolved catalog、bindings、policy validation、applicability、TaskPlan 和 scheduler semantics。
- `docs/output.md`：safe definition provenance/fingerprint 及 executable/private data exclusion。
- `src/product/**`、Project Definition public authoring entry、`docs/testing.md`、`docs/testing/cases/**`、fixtures 和 repository dogfood config：唯一 runtime 实现与证明材料。
