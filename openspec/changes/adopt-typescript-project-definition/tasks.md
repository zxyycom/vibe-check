> **核心句：**本 checklist 先阻塞验证 foundation/orchestration 与顺序 spec application，再把 JSON workflow 迁移为 structured TypeScript declarations、public/private check resolution 和 applicability-time task planning。

## 1. 阻塞审计、上游同步与 apply replay

本组 1.x 全部是阻塞门禁；任一项未完成时不得执行 2.x 及之后任何 implementation task。

- [ ] 1.1 **Artifact 阻塞审计。** 运行 `openspec list --json`、`openspec list --specs --json` 与 `bun run decisions:list`；核对 proposal/design/specs/tasks 围绕核心句，只新增 `project-definition` 并复用正确 owner IDs；确认临时 artifacts 未声称 approved/apply-ready、未越权修改其它 change/owner、`Open Questions` 无未回答项。
- [ ] 1.2 **上游 implementation/spec 同步门禁。** 确认 `establish-check-record-core` 已经实现、验收并把 `quality-checks`/`quality-records`/`quality-decision-policy` 同步为当前主 spec；随后确认 `establish-check-task-orchestration` 已经实现、验收并同步 `check-execution-orchestration`。核对 public `CheckDefinition` 与 private binding/contribution 分离、invocation planner/applicability timing、`requiresChecks` closure，以及没有 public cancellation/`AbortSignal`/timeout。
- [ ] 1.3 **长期 decision 门禁。** 使用 `decision-records` workflow 演进或归档与 fixed JSON、file-backed JSON gate、trusted executable module、runtime-contributed checks 冲突的 active decisions；保留 built-in tool-neutral intent 但不得用它禁止 custom execution。写入后运行 `bun run decisions:check`。
- [ ] 1.4 **Test evidence 门禁。** 在修改 tests 前运行 `bun run test-evidence:check`，用 `topics`/`list`/`show` 恢复 Config、CLI、runtime、Check/Record、orchestration、output 与 fixture Cases；明确新增/删除/重命名 entities 的 Owner 与 Proves。
- [ ] 1.5 **顺序 apply 门禁。** 在独立 temporary copy 用 official OpenSpec archive builder 按 core → orchestration → `adopt-typescript-project-definition` 顺序实际 apply，逐步 strict validate main specs；比较每个 removed/modified requirement 与 Scenario，确认 foundation 新增的 dynamic-policy help、Check/Record fixtures 等义务没有被本 change 丢弃。Replay 失败时先修 artifacts，不得进入 implementation。

## 2. Structured authoring 与 module loader

- [ ] 2.1 先增加失败证据：import-free plain export、optional helper equivalence、top-level await、missing/function/Promise export、wrong API、bare/local import failure、same-invocation single evaluation 与 runtime-invalid values。
- [ ] 2.2 实现 closed `ProjectDefinitionInput` runtime envelope；optional `vibe-check/project` exports 只提供 typed identity helpers/types，plain object 不依赖 brand 或 project-local SDK installation。
- [ ] 2.3 实现 invocation-scoped Bun loader：selected `.ts` module 在一个 CLI invocation 内 evaluate/normalize 一次，explicit imports 按 project Bun resolution，catchable failures 按 path/stage/reason 映射 exit `3`；不得对 future same-process multiple invocations 承诺 cache behavior。
- [ ] 2.4 实现 `ProjectCheckDeclaration` closed union：built-in ref 由 current Product registry 解析；custom metadata candidate 委托 foundation 生成 public `CheckDefinition`，direct/task execution variant 分别委托 owning adapter 生成 one private binding。Loader 不得把 authoring declaration 直接 cast 成 resolved CheckDefinition 或 inspect function source。
- [ ] 2.5 实现 detached/frozen declarative snapshot 与 definition data fingerprint；排除 direct runner、binding/planner factory、Task/completion functions、imports、closures 和 environment，并显式禁止以该 fingerprint 或 catalog fingerprint 单独命中 custom result cache。

## 3. Selection、policy/help 与 trust

- [ ] 3.1 先增加 selection tests：explicit relative/external module、fixed discovery、missing-source neutral、gate prerequisite、explicit finality、legacy JSON hard cut、wrong extension 和 `--no-project-definition`。
- [ ] 3.2 将 Config selection hard cut 为 explicit `.ts`、fixed `.vibe-check/config.ts` 与 neutral/disabled sources；删除 Vibe Check JSON parser/schema workflow 及 JSON/TS fallback/merge。
- [ ] 3.3 经各 owner validators 归一化 policy、built-in refs、custom public metadata、schedule metadata、references 和 DecisionPolicies；scalar CLI overrides 只 patch detached owned fields，不改变 declarations/bindings。
- [ ] 3.4 实现 minimal check selection：selected custom declarations 全部 initially requested，built-ins 保留 Product profile/request rules，policy requirements 与 `requiresChecks` closure 按 upstream owners 执行；不得增加 custom profile DSL。
- [ ] 3.5 更新 static help：不 load/evaluate module、不枚举 dynamic policy IDs；definition 加载后 unknown gate ID 才列本次 resolved catalog。实现 `--no-project-definition` pre-load conflicts 与 disabled provenance。
- [ ] 3.6 在 help/docs/pre-evaluation output 明确 same-process trusted code、Bun 权限、无 sandbox/public cancellation/hard timeout/termination guarantee；project code 可自行调用 library/subprocess 但 Core 不提供 command protocol。

## 4. Import-free init 与 migration

- [ ] 4.1 先增加 init ownership tests：new import-free target、no SDK package round-trip、repeat no-op、existing tool directory、unsafe node、race、write/close failure、owned cleanup、existing module 不执行和 legacy-JSON-only refusal。
- [ ] 4.2 将 `init` 改为只生成 deterministic UTF-8/LF `.vibe-check/config.ts` plain structured export，包含 literal API version、complete neutral policy、scheduler policy 与 Product-resolved built-in references；不得 import `vibe-check/project` 或携带 runner handles。
- [ ] 4.3 删除 sibling config schema generation/ensure/editor/runtime lifecycle；preserve existing safe `config.ts` bytes 且 init 永不 evaluate existing/new module。
- [ ] 4.4 实现 legacy `.vibe-check/config.json` scan/init diagnostic；保留 caller bytes，不 parse policy、不执行 commands、不 auto-convert 或创建 second active config。

## 5. Public/private resolution 与 invocation planning

- [ ] 5.1 增加 integration evidence：custom metadata/private binding 一对一、runner return 与 record emit 独立、built-in ref 使用 current Product implementation、duplicate/missing binding 在 work 前失败。
- [ ] 5.2 把 resolved public catalog/private bindings 交给 `quality-checks`，record candidates 只经 `quality-records` bound sink；Project loader 不得暴露 CheckManager/RecordManager 或构造 foundation contribution envelope。
- [ ] 5.3 Direct declaration 只注册 private direct adapter；task declaration 只注册 serializable schedule metadata 与 private binding/planner factory。Foundation 冻结 applicability/work handles 后才由 `check-execution-orchestration` 创建并全量 freeze TaskPlan；module load 与 execution 中均不得注册 Task。
- [ ] 5.4 证明 skipped/not-applicable 不调用 planner，invalid factory/plan 不启动 valid subset，`requiresChecks` quality-failed result 仍满足 lifecycle dependency；Project layer 不复制 scheduler validation/admission/report semantics。
- [ ] 5.5 证明 first-version custom bindings 每 invocation 执行且没有 custom result cache；built-in caches 继续服从各自 complete identity contract。

## 6. Output、fixtures 与 owners

- [ ] 6.1 先增加 machine schema/mapper/validator evidence：source、API、declarative fingerprint、disabled provenance、deterministic bytes；absolute module path、policy body、functions/bindings/import graph 不得进入 machine output。
- [ ] 6.2 投影 honest definition provenance，并保持 foundation catalog/policy fingerprints 独立；同步 runtime schema、derived types、examples 和 actual consumers。
- [ ] 6.3 增加 configured Project Definition fixture，覆盖 import-free starter、direct/task custom declarations、all-custom-requested、built-in profile、dependency closure、applicability-time planner、records/results 和 no custom cache。
- [ ] 6.4 将 repository dogfood 原子迁移到 import-free `.vibe-check/config.ts`，删除 active JSON/schema；`quality:*` wrappers 继续只传 root/args/streams/outcome。
- [ ] 6.5 同步 Navigation、Configuration、CLI、Architecture、Output、Testing docs 与 necessary examples；明确 Bun 只托管 definition、helpers optional、non-Bun projects 无需 SDK/Bun app runtime。
- [ ] 6.6 按 `test-evidence-review` 同步 Cases/Entities/Proves 并运行 `bun run test-evidence:check`。

## 7. 删除旧路径与验证

- [ ] 7.1 删除 unreachable JSON parser/config schemas/schema generation/two-target initializer/JSON fixtures；search 确认无 dual reader、legacy fallback、helper brand requirement、module-load TaskPlan 或 custom cache。
- [ ] 7.2 运行最窄 Project Definition/config/CLI/init/custom direct+task/output tests，再运行 product import smoke、`bun run typecheck:product`、`bun run lint:product` 与 `bun run test:product`。
- [ ] 7.3 运行 `bun run decisions:check`、`bun run test-evidence:check`、`bun run validate`、`bun run verify:vibe-check-workspace:required` 及跨边界 full verifier。
- [ ] 7.4 再次在 clean temporary copy 顺序 apply 三项 changes 并 strict validate resulting main specs；运行 `git diff --check` 和 focused searches 确认只 selected loader 越过 Product source boundary、无 host path/functions 进入 machine artifacts 且 diff 保持授权范围。
