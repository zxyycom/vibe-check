# Design

本 Design 以 Plan 形成时的 repository assurance inventory 为 catalog 迁移输入，先固定 quality fact、profile membership 与 execution boundary，再由同一 ordinary `Check` collection 派生 Project Definition、eligibility 和 aggregation。下文的 Readiness 记录实施前基线；实施后的当前事实由 stable owner、targeted tests、正式 Gate 与 handoff 共同证明。

## Context

### Plan 形成时的事实与权威边界

- [`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate) 是 Project Gate 当前行为 owner。正式 root names 已绑定 candidate-backed Gate；adapter 只消费 Product `RunResult.aggregate` 并映射 process exit `0/1/2`。
- Plan 形成时的 catalog 位于 [`scripts/project-gate/catalog.ts`](../../scripts/project-gate/catalog.ts)：20 个 command descriptors、required 14 个、full 19 个；当时的 [`createProjectGateDefinition()`](../../scripts/quality/project-gate/project-definition.ts) 将全部 descriptor 转成 process Checks。无参 adapter 与 `verify:vibe-check-workspace` 当时默认选择 full，这是本 Plan 要改为 required 的实施前状态，而不是当前或目标契约。
- Test Evidence 的 supported runner profile 发现并执行 `scripts/**` 与 `src/product/**` 下全部 `*.test.ts`；因此 full-only `product-tests` 不再提供独立测试事实。
- Root scripts typecheck 和 lint 已覆盖 Foundation sources，workspace format targets 也包含 Foundation，Test Evidence 会发现 Foundation tests。历史 Decision `vendor-foundation-as-repository-owned-script-tool` 已由 [`integrate-foundation-into-workspace-assurance`](../../docs/decisions/integrate-foundation-into-workspace-assurance.md) 修订：package manifest、cwd 或 wrapper 可运行不再自动构成独立 Gate assurance。
- Gate adapter 已在加载 private quality consumer 前准备并验证 exact installed candidate。Plan 形成时，`typecheck-scripts` 和 repository quality CLI path 会再次 prepare candidate；这是 wrapper composition 的重复责任。
- Package API documentation 已归档并交付 [documentation-complete candidate handoff](../archive/ship-public-package-api-documentation/package-api-documentation-handoff.md)。Gate implementation 若改变 candidate fingerprint inputs，必须 fresh prepare 并重新验证，不能沿用形成时 digest。

### 直接适用的长期 Decisions

| Decision | 本 Change 必须保持的结果 |
| --- | --- |
| [`execute-check-functions-in-caller-runtime`](../../docs/decisions/execute-check-functions-in-caller-runtime.md) | ordinary Check execution 在调用方 runtime 运行；单个 Check 仅在自身 assurance 需要时建立私有 subprocess/worker/thread。 |
| [`expose-ordinary-check-values-with-define-check`](../../docs/decisions/expose-ordinary-check-values-with-define-check.md) | `defineCheck` 只辅助 ordinary object authoring；不得建立 Gate-specific Check runtime 或 brand。 |
| [`use-native-object-composition-for-check-customization`](../../docs/decisions/use-native-object-composition-for-check-customization.md) | Eligibility wrapper 和 project composition 使用普通对象组合，不建立 adjustment API。 |
| [`bind-project-gates-to-run-aggregation`](../../docs/decisions/bind-project-gates-to-run-aggregation.md) | Gate 显式绑定同次 selection 的 eligible IDs 与 Product aggregation；adapter 不从 raw facts 重算结果。 |
| [`integrate-foundation-into-workspace-assurance`](../../docs/decisions/integrate-foundation-into-workspace-assurance.md) | Foundation 由普通 workspace checks 与 Test Evidence 证明；删除历史 package Gate identities，独有不变量交给对应 owner 或专门测试。该 Decision 在 Plan 形成时为 unaligned，现已由本 Change 落实并标记 aligned。 |
| [`default-project-gate-to-required-profile`](../../docs/decisions/default-project-gate-to-required-profile.md) | 无显式 profile 的 adapter 与默认 root 选择 required；显式 full 选择当前全部 Checks，且没有真实 full-only assurance 时允许与 required 同集。该 Decision 在 Plan 形成时为 unaligned，现已由本 Change 落实并标记 aligned。 |
| [`complete-project-gate-before-public-package-release`](../../docs/decisions/complete-project-gate-before-public-package-release.md) | 先完成 current Gate consumer evidence，再进入单独授权的 public publish。 |

本 Change 落实上述 default-profile 与 Foundation-assurance Decisions。若实施要求修改 npm package 导出的 `Check` / `Run` 类型或行为、重命名/删除正式 root commands、恢复默认 full、让 full 不再包含 required assurance，或恢复 Foundation 独立 Gate identities，必须暂停并先演进对应 Decision或取得新的范围确认。调整各 profile 的具体 Check membership 正是本 Change 的范围，不触发该暂停条件。

### Readiness 审计结论

以下结论关闭 Plan 的实施前门禁。它们是本 Change 的实现输入；实现完成后的行为仍由 targeted tests、required/full Gate 和 `gate-optimization-handoff.md` 重新证明。

#### Ordinary Check authoring 可行性

2026-08-23 使用 installed `vibe-check` public entry、现有 project-private process helper 和可观测的 process collaborators 运行了一个不写工作区文件的最小 prototype。同一 `ProjectDefinition` 包含：

1. 直接返回 structured result 的 native Check；
2. 将同一 `AbortSignal` 传给 process collaborator 并形成 transcript payload 的 process-backed Check；
3. 通过 ordinary object composition 将原 Check execution 包装为 `profile-excluded` N/A 的 eligibility Check。

实际 raw statuses 为 `prototype-native=passed`、`prototype-process=passed`、`prototype-excluded=not-applicable`，显式只聚合前两项时 aggregate 为 `passed`。因此不需要新的 Check subtype、Gate runtime 或 public authoring API；Implementation 1.12 必须把相同边界转成持久 targeted tests。

#### CLI、wrapper 与 Foundation caller 审计

| 当前入口 | 已确认的独立消费者 | 实施结论 |
| --- | --- | --- |
| `scripts/development/{format,lint,typecheck,test}.ts` 的 root workflow | root `format`、`lint`、`typecheck`、`test` package scripts及人/AI日常调用 | 保留薄 CLI；领域逻辑进入 import-safe operations。`test` 继续是 focused Product test入口，不重新进入 Gate。 |
| 上述 development CLIs 的 `foundation` scope | Foundation manifest scripts与四个待删除 Gate descriptors；没有其它 direct caller | 删除四个 scope branches和 `foundationFormatTargets`；workspace operations直接覆盖 Foundation source/tests。 |
| `scripts/validate.ts` | root `validate` workflow | 保留 root adapter；Gate直接调用拆出的 docs operations。 |
| `scripts/decision-records.ts` | root `decisions`及 Decision维护/查询 workflow | 保留 CLI和现有 import-safe `validateDecisionRecords()`；Gate直接调用 operation。 |
| `scripts/test-evidence/index.ts` | root `test-evidence`及 Test Evidence查询/闭合 workflow | 保留 CLI；Gate从 import-safe module直接调用 `checkTestEvidence()`，不 import顶层执行的 `index.ts`。 |
| `scripts/test-evidence/test-rules.ts` | Script Tooling声明的 focused rule验证命令 | 保留薄 CLI；提取 import-safe operation给 Gate与 CLI共用。 |
| `scripts/quality/index.ts` | root `quality`和 AGENTS 声明的人/AI dogfood入口 | 保留完整 prepare-and-run workflow；Gate不调用它。 |
| `scripts/quality/scan.ts` | candidate-backed quality runner与项目正式 pure scan adapter | 保留 scan-only adapter；`repository-quality`在 Gate已准备 candidate后通过 locked process调用它。 |
| `scripts/project-gate/index.ts` | 三个正式 `verify:vibe-check-workspace*` roots | 保留 adapter和三个 root names；只调整缺省 profile与内部 Definition。 |
| Foundation `package.json`、专用 `tsconfig.json`、pnpm workspace/lock importer | 旧 Gate和 package自身；source consumers全部使用相对路径，专用 tsconfig只缩窄 root `scripts/**/*.ts` 已覆盖的文件并更换 build-info path | 删除 private package envelope、专用 config及其命令说明；保留 `scripts/tools/foundation/src` 与 tests，并把 README改成普通 repository scripts component说明。 |

Gate caller 归零不等于 root/focused CLI consumer归零。上表列出的 retained adapters继续由 focused CLI tests证明 argv、stdout/stderr和 exit mapping；Foundation envelope删除后必须再次执行路径过滤 caller search，任何新发现的独立 caller都会阻塞该删除并要求同步本 Plan。

#### Dependency 审计

Plan 形成时，catalog 只有 `quality-quick-check` 和 `quality-full-check` 声明 dependencies：前者依赖四个 typecheck/lint Checks，后者额外依赖 `test-evidence`。Repository quality root 可以独立 prepare candidate 并运行相同 scan；这些 edges 不传递 data、不建立 candidate identity，也不是 scan 的必要 precondition，只是历史排序约束。

目标 `repository-quality` 不声明 `dependsOn`。Candidate preparation仍是 adapter在 Definition启动前完成的 invocation precondition；parallel capacity和共享资源由 scheduler fields表达。其余目标 Checks本来没有 dependencies，因此 required/full及任意 tag-disabled selection的静态 closure均成立。

#### Candidate baseline 与失效条件

Readiness 时的 `.cache/vibe-check/package-candidate/preparation-receipt.json` 记录：

- candidate version：`0.0.0-local.1057c5d542f0`；
- input fingerprint：`1057c5d542f0453654c1702010659573394eb0331c8e5e8ae6d89fe82cfbeab7`；
- tarball SHA-256：`f467dc9aff1436fb8f4f37d4586a9e92a7fea26e3dd51d337d67d0879a5ea76e`；
- installed entry：`scripts/quality/node_modules/vibe-check/index.mjs`，SHA-256 `74a201506adf85dd2ef743f5a0525acb1e2af3ad2fbee43bc20c95618c1acb59`。

该 snapshot只证明 Plan readiness，不是最终 handoff identity。`preparePackageCandidate()` 的 fingerprint覆盖 Bun version、candidate dependency pins、非测试 Product runtime sources、package README/JSDoc inputs与examples、candidate entry和builder；任一输入改变，或 receipt、tarball、staging、installation、resolved entry不匹配，都必须重建。只有同一函数重新检查全部边界并返回 `reused: true` 时才允许复用；Implementation结束后无论是否复用，都必须把当次 receipt与 installed entry写入 `gate-optimization-handoff.md`。

## Goals / Non-Goals

### Goals

- 让一个独立 assurance obligation 对应一个稳定 Check identity，并让 identity set 而不是历史 command count 成为 catalog review 单位。
- 让 Gate composition 只产生遵循 public contract 的 project-owned ordinary `Check` values；project-local entry 只增加 profile/tag selection metadata。
- 让 import-safe TypeScript operation 直接返回或映射 `CheckResult`；CLI 只保留 argv、console、exit 和 focused workflow 责任。
- 只在 external executable、pinned toolchain、exact candidate consumer、isolation 或确有独立消费者的 package boundary 本身需要被证明时使用 process。
- 合并 required/full 的 repository quality identity，删除 Test Evidence 已完整覆盖的 Product test 重复运行，并删除已由 workspace assurance覆盖的四个 Foundation package gates。
- 从同一 entry collection 派生 raw eligibility 与 aggregate eligible IDs，保持 cancellation、progress、transcript、candidate identity 和 adapter closure。
- 让无参 adapter、`verify:vibe-check-workspace` 与 `:required` 默认选择 required；只有 `:full` 或显式 `--profile full` 才选择 full。
- 以 current exact candidate 和正式 roots 生成 `gate-optimization-handoff.md`。

### Non-Goals

- 不恢复 legacy verifier，不重新切换正式 root bindings，也不改变 Product aggregation、Check result、Record、message、visibility 或 typed dependency contract。
- 不删除 Foundation source 或 tests；删除 Readiness 审计已确认无独立消费者的 package envelope、专用 tsconfig 与 scoped wrappers。
- 不因 Gate 停止调用某个 CLI 就删除仍有 root、package、人工、AI 或 query consumer 的 CLI。
- 不重命名或删除三个正式 root commands，不让 full 脱离 required assurance 的超集关系。
- 不公开 Gate catalog、profile/tag grammar、process helper、transcript format 或 Project Gate runtime 到 npm package。
- 不建立 generic command registry、generic workflow framework、第二 Check execution variant 或 project-wide dependency injection 层。
- 不新增 durable receipt/event protocol、summary log、retention/cleanup policy 或 generic logger；这些属于相邻但非阻塞的 log evidence Draft。
- 不访问 npm registry、credentials 或执行 publish；publish 由下游 Change 在再次授权后完成。

## Decisions

### Intended Change

#### 1. Assurance mapping 先于 implementation shape

每个 Gate entry 必须先回答：

1. 哪个稳定 owner 定义成功与失败；
2. 哪些 exact inputs、cwd、manifest、toolchain 或 installed artifact 被验证；
3. 可观察的 failed 与 unavailable 信号是什么；
4. 是否存在另一个 Check 已证明相同 owner、inputs 和失败信号；
5. 是否只有 external/process boundary 才能产生该 assurance。

只有 owner、input boundary、失败恢复或独立 consumer 不同，才保留不同 identity。Command path、CLI name、profile label、文件路径重叠或迁移期数量均不单独建立 identity。

迁移 catalog 到目标 catalog 的 20-to-14 mapping 如下。表中“当前作用”描述现有 command 实际证明的事实；“问题”说明为何不能原样保留；“调整方向”是本 Plan 的目标。任何 implementation discovery 若改变此表，必须先同步 proposal、design 和 tasks，再继续改代码。

| 当前 Check 与 profile | 当前作用 | 可能存在的问题 | 调整方向 |
| --- | --- | --- | --- |
| `typecheck-product`；required/full | 通过 `tsgo -p tsconfig.product.json` 检查 Product source、tests 和 package import boundary 的 TypeScript 类型。 | Gate 通过 development CLI、argv 和 exit code 间接调用；真正需要的 process 是 pinned `tsgo`，不是 Bun wrapper。 | 保留 identity；提取 import-safe typed operation，由 ordinary process-backed Check 直接运行 pinned `tsgo` 并保留 transcript/cancel。 |
| `lint-product`；required/full | 通过 pinned Oxlint 检查 `src/product`，并以 deny-warnings 作为失败条件。 | CLI wrapper 只负责 scope/exit 映射，却被当作 Gate capability source。 | 保留 identity；Check 直接调用显式 product scope 的 typed lint operation，external Oxlint process 仍保留。 |
| `typecheck-scripts`；required/full | 通过 `tsgo -p tsconfig.json` 检查 `scripts/**`；当前 CLI 还会先 prepare candidate。 | Gate adapter 已准备 candidate，CLI 再次 prepare；类型检查事实与 candidate lifecycle 被错误耦合。 | 保留 identity；typed operation 只运行 scripts typecheck，不 prepare candidate；Gate 与 root CLI 分别拥有各自前置流程。 |
| `lint-scripts`；required/full | 通过 pinned Oxlint 检查整个 `scripts` tree，其中已包含 Foundation sources/tests。 | 通过 CLI 回环；另设 Foundation lint 只会重复同一 rule owner 与 source coverage。 | 保留 workspace lint identity并直接调用 typed operation；它成为 Foundation lint 的唯一 Gate owner。 |
| `format-check`；required/full | 通过 pinned Oxfmt 检查 workspace targets，包括 Product、scripts、Foundation manifest/config/source/tests。 | 通过 CLI 回环；另设 Foundation format Check 会重复相同 files 与 rules。 | 保留 workspace format identity并直接调用 typed operation；它成为 Foundation format 的唯一 Gate owner。 |
| `quality-quick-check`；required | 从 `scripts/quality/index.ts` 启动 candidate-backed neutral Package Run，证明 repository quality dogfood。 | 与 `quality-full-check` 执行相同 command 和 quality scope；还会再次 prepare candidate；Readiness 审计确认其 typecheck/lint dependencies 只用于排序。 | 与 `quality-full-check` 合并为 `repository-quality`；required/full 共用一个 identity，消费已准备 candidate 的 scan-only process，不保留 dependencies。 |
| `docs-json-validator`；required/full | 检查受管 JSON 文件能被严格解析。 | 已有 TypeScript validator，但 Gate 经 `validate.ts` argv/exit 回环。 | 保留 identity；直接调用 import-safe JSON validation operation，不创建虚假 process transcript。 |
| `docs-schema-validator`；required/full | 检查 published machine schemas 生成结果与严格 schema compile/validation。 | 已有 TypeScript operation，CLI process 没有独立 assurance。 | 保留 identity；直接调用 import-safe schema validation operation。 |
| `docs-example-validator`；required/full | 检查 machine artifact examples、generated examples 与 report examples 对应当前 schema/contract。 | 已有 TypeScript operation，CLI 回环把结构化错误压成 exit code。 | 保留 identity；直接调用 import-safe example validation operation，并由 owning Check 映射失败诊断。 |
| `docs-links-validator`；required/full | 检查 repository Markdown 的本地文件和 anchor links。 | 纯 TypeScript/filesystem validation仍经 CLI process。 | 保留 identity；直接调用 import-safe link validation operation。 |
| `decision-records`；required/full | 严格验证 Decision Markdown、index、relations、status/alignment 与候选结构。 | 已存在 `validateDecisionRecords()` typed capability，当前仍经 CLI process和 console/exit映射。 | 保留 identity；Check 直接调用 `validateDecisionRecords()` 并映射 structured validation result。 |
| `test-evidence`；required/full | 发现并运行 `scripts/**` 与 `src/product/**` 的完整 supported Bun test surface，再验证所有 test entities 与 semantic Cases闭合。 | 外层 CLI wrapper 不必要；内部 Bun runner 是真实 process，不能因改 native而消失。它已覆盖 `product-tests` 和 Foundation test files。 | 保留 identity；直接调用 `checkTestEvidence()`，继续让内部 Bun runner 使用 signal-aware process；它成为唯一 Product test事实 owner。 |
| `test-evidence-rule-tests`；required/full | 校验 pinned ast-grep version，并运行 Test Evidence YAML rule fixtures。 | 当前 module import 即执行 work；不能作为 import-safe capability。 | 保留 identity；提取 import-safe rule-test operation，真实 ast-grep process继续保留。 |
| `git-diff-whitespace`；required/full | 运行 `git diff --check`，检查当前 index/worktree diff 的 whitespace errors。 | 这是合理 external boundary；问题只在于不应迫使所有其它 Checks 都采用同一 command descriptor model。 | 保留 identity和 direct Git process；继续保存 transcript/cancel/failure facts。 |
| `product-tests`；仅 full | 单独运行 `bun test src/product`。 | Test Evidence 已在 required/full 都运行相同 Product test files；没有独立 cwd、manifest或配置 contract，属于真实重复执行。 | 删除 identity；Product test success/failure 只由 `test-evidence` 证明。 |
| `toolkit-foundation-typecheck`；仅 full | 从 Foundation package cwd 执行 manifest `typecheck`，最终使用专用 tsconfig 检查 Foundation `src` 与 `test`。 | Root `typecheck-scripts` 已检查相同 TypeScript files；Readiness 审计确认专用 tsconfig 只缩窄 root include 并更换 build-info path，没有独有 compiler 约束或 caller。 | 删除 identity、专用 tsconfig 和 `foundation` typecheck scope；由 `typecheck-scripts` 唯一接管 source/test types。 |
| `toolkit-foundation-lint`；仅 full | 从 Foundation package cwd 执行 manifest `lint`，检查 package `src` 和 `test` targets。 | `lint-scripts` 已用同一 pinned Oxlint 与规则覆盖同一 sources；Readiness 审计未发现独立 package caller。 | 删除 identity、manifest script 和 `foundation` lint scope；Foundation lint 只由 `lint-scripts` 证明。 |
| `toolkit-foundation-format-check`；仅 full | 从 Foundation package cwd 执行 manifest `format -- check`，检查 Foundation manifest、tsconfig、`src` 和 `test` targets。 | Workspace `format-check` 已用同一 Oxfmt 覆盖这些 files；package-local target list 没有独立结果或 caller。 | 删除 identity、manifest/config targets、`foundation` format scope 和 `foundationFormatTargets`；保留的 Foundation source/tests 继续由 workspace `format-check` 覆盖。 |
| `toolkit-foundation-tests`；仅 full | 从 Foundation package cwd 执行 manifest `test`，运行 Foundation test suite。 | Test Evidence 已发现并运行相同 Foundation `*.test.ts`；package command 可运行不产生第二份测试事实，且没有独立 caller。 | 删除 identity、manifest script 和 `foundation` test scope；Foundation tests 只由 `test-evidence` 证明。 |
| `quality-full-check`；仅 full | 与 quick identity相同，运行 candidate-backed repository quality；额外声明 `test-evidence` dependency。 | Command、quality scope和结果语义与 quick完全相同；profile-derived identity和不同 dependency list制造重复与静态图复杂度。 | 合并到 required/full 共用的 `repository-quality`；profile不改变 quality行为，dependencies只保留真实数据/前置关系。 |

该 mapping 当前派生 required/full 各 14 个 identities。无参 adapter 与默认 root 选择 required；full 只由 `:full` 或显式 `--profile full` 选择，并选择 catalog 中当前全部 Checks。实现和 tests 必须断言 identity set、profile membership 与每项理由，不得断言裸数量、要求两个 profile 数量不同，或用数量阻止合法 catalog 演进。

目标 identity set如下；required/full当前都使用完整集合：

```text
typecheck-product
lint-product
typecheck-scripts
lint-scripts
format-check
repository-quality
docs-json-validator
docs-schema-validator
docs-example-validator
docs-links-validator
decision-records
test-evidence
test-evidence-rule-tests
git-diff-whitespace
```

#### 2. Gate entry 只拥有 selection metadata

Project-owned composition 使用以下私有边界：

```ts
interface ProjectGateEntry {
  readonly check: Check;
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}

function createProjectGateEntries(
  runtime: ProjectGateRuntime
): readonly ProjectGateEntry[];
```

`entry.check` 自己拥有 `checkId`、display name、options、dependencies、scheduling、children、Records 和 execution。`ProjectGateEntry` 不复制这些字段，也不进入 public package API。

`ProjectGateRuntime` 只绑定本次 invocation log directory、already-prepared candidate identity 和少量 project-private collaborators。它不进入 Product `CheckExecutionContext`、Check options 或全局 service locator。

#### 3. Eligibility 与 aggregation 从同一 entry collection 派生

Project Gate controls 在 work 前解析一次 closed profile/tag selection。无显式 profile 时选择 required；`verify:vibe-check-workspace` 与 `:required` 都绑定 required，`:full` 绑定 full，显式 `--profile` 继续覆盖缺省值。Normalized selection 随后同时交给：

1. Definition projection：excluded entry 保留原 identity，但 execution 返回 `profile-excluded` 或 `tag-disabled` N/A；eligible entry 委托原 ordinary Check execution。
2. Aggregation projection：从同一 entries 计算 eligible IDs，并绑定 `{ mode: "all", unavailable: "propagate", notApplicable: "fail", empty: "failed" }`。

Eligibility wrapper 使用 native object composition，不让每个 Check 解析 flags，不从 settled results 反推 selection，也不维护第二份 ID catalog。Static dependencies 必须在使用它的每个 profile 中 eligible。

Dependencies 只表达 execution data 或必要 precondition；资源排序使用现有 scheduler fields，不用伪 dependency。Candidate preparation 是 Gate adapter 的 invocation precondition，不是另一个 Check 的 dependency。

#### 4. Native、process 与 CLI 是三个不同边界

| Assurance shape | Gate execution | CLI lifecycle |
| --- | --- | --- |
| Import-safe TypeScript operation 可直接形成结构化结果 | Check 直接 import/call operation | 有 root/query/focused consumer 时保留薄 adapter。 |
| Operation 需要 external executable | Check-local async process helper 传递 `AbortSignal`，保存真实 transcript | CLI 可以调用同一 operation，但 Gate 不调用 CLI。 |
| Package manifest/cwd、pinned toolchain、exact installed consumer 或 process isolation 本身需要证明 | 保留显式 process boundary，并记录该边界独有失败 | Package/root command 可继续作为 acceptance 入口。 |
| 模块只解析 argv、写 console、设置 exit code 或再启动 wrapper | 不可作为 Gate capability source；提取 import-safe operation 或删除零 caller wrapper | 只保留 adapter 责任。 |

Import-safe 模块在 import 时不得读取 `process.argv`、写 stdout/stderr、设置 `process.exitCode`、启动 child work 或修改全局状态。CLI module 只在 `import.meta.main` 或等价 main guard 下执行 adapter。

#### 5. Candidate preparation 与 repository quality 各有唯一 owner

Project Gate adapter 每次 invocation 只调用一次 `preparePackageCandidate()`，然后校验 private consumer 解析的 installed `vibe-check` entry。任何 Definition 或 Check work 都发生在成功 identity 校验之后。

`repository-quality` 使用同一个 identity 加入 required/full。当前两个 profile 执行相同 quality scope，因此不读取 profile flag，也不建立空 mode branch。它运行 scan-only exact private consumer，不调用会再次 prepare 的 root quality adapter。

Root `quality` command 仍是独立人/AI workflow，继续自己完成 pinned-tool binding、candidate prepare 和 neutral Package Run；它的完整生命周期不能被 Gate 内部路径替代。

#### 6. Foundation 退出历史 package Gate 边界

Foundation 已是 `scripts/**` 下的 repository-owned source，不再因为过去是子仓库或 private package 而拥有独立 Gate identity。四项历史责任按真实 owner收敛：

- source 与 tests 的 TypeScript 类型由 `typecheck-scripts` 证明；
- source 与 tests 的 lint 由 `lint-scripts` 证明；
- manifest、config、source 与 tests 的格式由 `format-check` 证明；
- Foundation `*.test.ts` 的执行与 Case闭合由 `test-evidence` 证明。

Readiness 审计已确认 `scripts/tools/foundation/tsconfig.json`、`package.json` scripts、pnpm workspace importer 和 scoped development CLI 没有独立 caller 或独有配置约束。实施删除这些 package 残留，更新 lockfile 与 README；`scripts/tools/foundation/src` 及 tests 继续作为普通 repository scripts source，由上列四个 owners 证明。

#### 7. Caller audit 已锁定 adapter lifecycle

实施按 Readiness caller 审计维护两类可追溯关系：

1. Capability callers：Gate Check 直接使用哪个 operation，以及 operation 的 input/result/error owner。
2. CLI consumers：root package scripts、Foundation manifest、人工/AI workflow、query use 和 direct imports。

Root `format`、`lint`、`typecheck`、`test`、`validate`、`decisions`、`test-evidence` 与 `quality` 按 Readiness caller 表保留。Foundation package scripts、scoped development CLI 与专用 config 按同一审计删除；实施后的 caller search 必须证明没有悬空 references。

Gate caller 归零不等于 CLI consumer 归零。CLI tests 继续只证明 argv、stdout/stderr 和 exit mapping；领域 operation tests 证明实际行为。

#### 8. Transcript 只记录真实 process evidence

Process-backed Check 的 local transcript 保留 command、status、signal、安全 error summary、stdout 和 stderr；cancel signal 必须传给 child process。Transcript write failure、process unavailable、exit unavailable 和 execution cancellation 继续映射为不同 unavailable reason。

非零 exit 保留 Check-local `command-failure` Record 和唯一 `error / command-failed` terminal message。Message 只包含 exit code、signal 和 transcript basename；不得包含 child output、完整 path、args、credential、digest 或 transcript content。

Pure native Check 不创建空 transcript。其 structured result、Records、messages、progress 和 effect failure 由 Product owner 承接，不另建 Gate result 或 logger。

#### 9. Current evidence 必须在实现后重新绑定

Implementation 改变 project Gate、script operations、declarations 或 candidate inputs 后，Plan 必须：

1. fresh prepare 或证明安全复用 matching candidate；
2. 校验 private consumer installed entry identity；
3. 运行 focused native/process/CLI tests、partial eligibility、required/full roots 和 Case closure；
4. 重新核对 documentation projection、declaration tree、tar digest 与 isolated consumer；
5. 写出 `gate-optimization-handoff.md`，记录 assurance mapping、identity sets、caller audit、正式 bindings、candidate identity 与完整验证。

已归档 `gate-handoff.md` 继续拥有 cutover/legacy-retirement 事实；已归档 documentation handoff 提供 documentation contract 与失效条件。新 handoff 不复制它们的全文，也不声称 npm registry state 或 publish authorization。

### Resulting Impacts

- `scripts/project-gate/**` 从 command descriptor catalog 变为 selection、adapter 与 ordinary Check entry composition；tests 从 count locks 改为 identity/membership/closure evidence。
- `scripts/quality/project-gate/**` 同时包含 native and process-backed ordinary Checks，并由一个 eligibility projection 与一个 aggregation projection 消费。
- Development、docs、Test Evidence 和 rule validation owner 需要导出 import-safe operations；retained CLI 只映射边界输入输出。
- Required/full membership 当前都是同一组 14 个 identities；full 仍表示显式选择全部 current Checks，但不制造虚假 full-only assurance。
- Candidate preparation、transcript、progress、aggregate 与 process exit 继续由各自单一 owner 承接；不引入平行 summary 或 second result source。
- Stable Script Tooling、Case evidence、candidate acceptance、delivery navigation 和 publish input reference 必须同步当前实现与 handoff。

## Risks / Trade-offs

- **CLI side effects 被错误 import：** 直接 import legacy main module 会在 work 前启动或修改 process 状态。Mitigation：先提取 operation，并用 import-safety test 证明 module evaluation 无副作用。
- **Process 被错误消除：** External tool、pinned toolchain 或 installed consumer boundary 若被当成普通函数调用，会失去 toolchain/isolation assurance。Mitigation：按 mapping 保留 process 并验证独有失败；历史 Foundation package cwd 不自动满足这一条件。
- **Foundation coverage 随 package envelope 一并退化：** 删除 scoped wrappers 时若同时缩窄 root targets，会让 source或tests退出普通 workspace assurance。Mitigation：保持 root `scripts/**/*.ts`、scripts lint、workspace format targets和 Test Evidence discovery覆盖 Foundation，并用 focused assertions与最终 caller search证明接管关系。
- **Dependency 被当作排序工具：** 伪 dependencies 会降低并行并让 profile closure 脆弱。Mitigation：只保留 data/precondition edge，资源控制交给 scheduler。
- **Native Check 丢失诊断：** 移除 process transcript 后，native operation 若只 throw generic error 会降低可行动性。Mitigation：typed result/error mapping 必须由 owning Check 形成 Records/messages/unavailable reason。
- **Candidate evidence 失效：** Script/declaration changes 可能改变 artifact fingerprint。Mitigation：实现后 fresh prepare 并重新绑定 digest，不用旧 HEAD 或局部 hash 替代。
- **Change 过度扩张：** Native authoring 不应演变成 public process API、logger 或 generic workflow framework。Mitigation：所有共享 helper 保持 project-private，新增责任必须有两个现实 consumers 与同一不变量。

## Open Questions

无。Readiness 审计已经关闭实施前问题，并锁定以下边界：

1. required/full 当前共用同一组 14 个 identities；显式 full 选择全部 current Checks，但不为维持差异创建 full-only identity；
2. `repository-quality` 在两个 profile 中行为相同且只有一个 identity；
3. Product 与 Foundation tests 由 Test Evidence 执行；Foundation source type/lint/format分别由普通 workspace checks执行，四个历史 package gates删除；
4. 不改变 public Product contract；保留 `verify:vibe-check-workspace`、`:required`、`:full` 三个 root names，把无参 adapter 和默认 root 从实施前的 default full 改为 required，并保持 full 是 required assurance 的超集。Publish 权限属于下游 Change，不是本 Plan 的待决事项。

若 implementation evidence 否定上述任一选择，停止对应改动并先更新本 Plan。只有要恢复 Foundation gates、修改 npm package 导出的 `Check` / `Run` contract、改变三个正式 root names、恢复无参默认 full，或让 full 不再包含 required assurance 时，才需要用户确认新的长期方向；目标 identity 内部实现和已审计的 zero-caller cleanup 按本 Plan 直接推进。
