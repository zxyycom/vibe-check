# Package API documentation handoff

## 结论与绑定边界

本 Change 已对下列 **fresh local candidate** 完成 documentation-complete 验收。首次 prepare
返回 `reused: false`；随后 receipt、staging、tar 与 quality consumer installation 的内容复核一致。

- `HEAD`：`e88d1a2292f618b7bfb9ba1908c159311ecd4cf1`。
- 实现位于该 HEAD 之上的**未提交 worktree**；因此 HEAD 单独不能绑定本产物。下面的完整 input
  fingerprint、artifact digest 和投影 bytes 才共同绑定本次证据。
- candidate version：`0.0.0-local.1057c5d542f0`。
- input fingerprint：`1057c5d542f0453654c1702010659573394eb0331c8e5e8ae6d89fe82cfbeab7`。
- artifact：`/workspace/vibe-check/.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.1057c5d542f0.tgz`；
  `209105` bytes；SHA-256
  `f467dc9aff1436fb8f4f37d4586a9e92a7fea26e3dd51d337d67d0879a5ea76e`。

本文件本身是 Change 审计记录，不在 candidate input fingerprint 中；它不替代 receipt，也不把
local candidate 表述为已发布 package。

## Receipt、staging 与 consumer 安装

receipt 为
`/workspace/vibe-check/.cache/vibe-check/package-candidate/preparation-receipt.json`（schema version
`1`）。它记录上述 version、fingerprint、artifact path/digest，以及以下 consumer identity：

| 边界 | 已核对路径／值 |
| --- | --- |
| staging | `/workspace/vibe-check/.cache/vibe-check/package-candidate/staging` |
| consumer directory | `/workspace/vibe-check/scripts/quality` |
| installed package | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check` |
| resolved entry | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check/index.mjs` |
| resolved entry SHA-256 | `74a201506adf85dd2ef743f5a0525acb1e2af3ad2fbee43bc20c95618c1acb59` |

tar inventory 有 `116` 个文件，其中 `113` 个为 declaration；receipt 的 allowlisted files 与该
inventory 一致。

## 投影与 declaration 审计

### README

repository root `README.md`、staging `README.md`、tar 的 `package/README.md` 与 installed package
`README.md` 均为 `7547` bytes，且逐字节相同，SHA-256 均为：

`8d7a7c332eac7172070e68be263ec76f864b1ed1dd2092b378043f42bc74702a`。

### 完整 declaration tree

以下三个 `types` tree 各有 `113` 个 `.d.ts`、总计 `112664` bytes，且归一化 manifest aggregate
均为 SHA-256 `3b18aef467fc889d72a3d160c88a80179d43511f32afcc7b87a4149f14ec7108`：

| 边界 | `types` 根 |
| --- | --- |
| staging | `/workspace/vibe-check/.cache/vibe-check/package-candidate/staging/types` |
| tar | `package/types` |
| installed | `/workspace/vibe-check/scripts/quality/node_modules/vibe-check/types` |

aggregate 的复算方式是在每个 `types` 根执行
`find . -type f -name '*.d.ts' -print0 | sort -z | xargs -0 sha256sum | sha256sum`；因此同时绑定相对路径与
每个 declaration 的 bytes。

`types/src/product/definition/custom-check.d.ts` 在这三个边界均为 `16359` bytes，SHA-256 为
`ff52d6d7a8e104874b18a1a60a55b8a56532d00406605cc9f6a23f59cbe82f58`。

`types/scripts/package-candidate/entry.d.ts` 在这三个边界均为 `979` bytes，SHA-256 为
`190cb6d1ed7038c414d499227619d0de60cb72591d58f095f424449865e19534`；它保留 package summary 与
`@packageDocumentation`。

### `custom-check-definition` JSDoc payload

`custom-check-definition` region、source JSDoc、staging declaration、tar declaration 与 installed
declaration 中的去 comment-prefix payload 均为 `700` bytes，SHA-256 均为：

`6cf24dc17d85f35b938f4e786e89e3a9bfb3ae5c8c37ab6a79b0ab21800fb2bd`。

比较的五个 owner/投影分别是：

1. `docs/examples/package-api/custom-check.ts` 的 `custom-check-definition` region；
2. `src/product/definition/custom-check.ts` 中 `defineCheck` 的 generated `@example`；
3. staging 的 `types/src/product/definition/custom-check.d.ts`；
4. tar 的 `package/types/src/product/definition/custom-check.d.ts`；
5. installed package 的 `types/src/product/definition/custom-check.d.ts`。

## Public API 与 documentation contract

`CURRENT_PUBLIC_CONTRACT` 是 public inventory 的唯一来源。本 candidate 保持 `4` operations、`3`
values、`18` types，未新增 runtime 或 type export：

- operations：`defineCheck`、`defineConfig`、`inherit`、`run`；
- values：`duplicateDetection`、`fileMetrics`、`functionMetrics`；
- types：`Check`、`CheckAggregate`、`CheckAggregation`、`CheckExecution`、`CheckExecutionContext`、
  `CheckOutcome`、`CheckResult`、`CheckUnavailableReason`、`DuplicateDetectionOptions`、
  `FileMetricsOptions`、`FunctionMetricsOptions`、`InheritableCheckCollection`、`ProjectEffects`、
  `ProjectDefinition`、`ProjectQualityConfiguration`、`RunControls`、`RunResult`、`SchedulerPolicy`。

实际使用的 JSDoc tags 属于 closed policy：`@packageDocumentation`、`@remarks`、`@typeParam`、
`@param`、`@returns`、`@example`；未引入 `@throws` 或 `@deprecated`。

registry 有四项 runtime-evidenced projection：

| ID | source / region | title | target |
| --- | --- | --- | --- |
| `quick-start` | `quick-start.ts` / `quick-start` | 最小 Project Definition 与 Run | README placeholder `quick-start` |
| `custom-check-definition` | `custom-check.ts` / `custom-check-definition` | 定义带 options、Records 与 messages 的自定义 Check | `src/product/definition/custom-check.ts` 的 `defineCheck` JSDoc |
| `custom-check-run` | `custom-check.ts` / `custom-check-run` | 运行自定义 Check | README placeholder `custom-check` |
| `typed-dependency` | `typed-dependency.ts` / `typed-dependency` | 读取 typed dependency final data | README placeholder `typed-dependency` |

`README.md` 与 registry-target declaration 连续尾部的 `@example` 是 generated projection。renderer
计算完整 expected tail；被删除或迁移 target 遗留的 tail 的 expected 是移除。`--check` 与 candidate
按 checked-in bytes 拒绝 drift，`--write` 是唯一 repair action；维护者不先手编辑 generated output。

## 核心输入锚点

下表列出本次 fingerprint 中 documentation 核心输入的 bytes 与 SHA-256；Product source declarations、
candidate entry/builder 与其他 fingerprint inputs 由完整 fingerprint 共同绑定。

| 输入 | bytes | SHA-256 |
| --- | ---: | --- |
| `docs/package-readme.template.md` | 4195 | `fc2c397c1eb45b4d0d48dca587ebbf8134b42cc37a4c315edfd9c74b3e769564` |
| `docs/examples/package-api/quick-start.ts` | 684 | `6cc8c417c74499c0506a01e706a058477391f76ba1433d07cd56fe0f36bc0337` |
| `docs/examples/package-api/custom-check.ts` | 1429 | `dba412f198c9e1a2f64a9e73d4d09744c7835da794aebd9b13bda699749b61b9` |
| `docs/examples/package-api/typed-dependency.ts` | 1738 | `35cdc86544dbcbe241089225d388ba19cf94244109568d9acbd68d0d1777c61f` |
| `scripts/docs/package-api-docs/registry.ts` | 2067 | `50d22b8c1881cab1ab094eda1fbd6f6da3efecc591050a9e9f9192a16b724f60` |
| `scripts/docs/package-api-docs/render.ts` | 23075 | `4184040a441b9b8e8a6b583a0d5ac240254cbd082f6106a0374e3f73da1df82f` |

## 验收证据

fresh candidate 验收已经通过以下边界：

- `6` 个目标 test files 中的 `7` 个 test nodes 通过；覆盖 public contract/JSDoc policy、renderer/CLI、
  candidate lifecycle、installed docs/examples 与 runtime consumer acceptance。
- `bun run test-evidence -- check --root .`：`149/149` current Bun test entities 由 `46` 个
  semantic Cases 映射闭合。
- `bun run format -- check`、Product 与 scripts 的 typecheck/lint、`bun run validate`、
  `git diff --check` 均通过。
- 写入本 handoff 前，`bun run change-plan -- check changes/ship-public-package-api-documentation`
  通过，状态为 `18/19`：唯一未完成项是当时尚未写入本记录的 `2.7`。
- `bun run verify:vibe-check-workspace:required`：`14` passed、`6` excluded、`0` fail、`0`
  unavailable。
- AI-ready 与 coding-style 的独立复审均无 P0、P1 或 P2 发现。

本记录写入后，任务 `2.7` 完成；其后仅重新运行 documentation、format、diff 与 Change checks，确认
审计文档自身不引入 projection 或 Change drift。

## 失效条件与未授权范围

以下任一变化都会使本 handoff 的 matching-artifact 证据失效，必须 fresh prepare 并重新验收：上表列出的
任一 input、任何 Product declaration source、candidate builder、manifest、receipt 或 consumer test。不得用
相同 HEAD、版本前缀或局部 README hash 代替新的 fingerprint/digest 对应关系。

本 Change **没有** npm publish、registry、credential、legal metadata 或公开 release version 的授权；它也不
证明 Node.js host、public CLI、plugin API、subpath exports 或新的 compatibility commitment。`full` Project
Gate 与 Gate optimization evidence 留给下游 Change；下游只能消费同时匹配本 fingerprint 与 artifact digest 的
artifact，并在任何失效条件发生后刷新本记录。
