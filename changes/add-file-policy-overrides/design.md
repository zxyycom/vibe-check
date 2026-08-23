# Design

本设计在不复制 Check 或 scope owner 的前提下，用一份冻结的 Project Definition 建立确定性文件政策解析。

## Context

当前稳定事实仍由 `docs/configuration.md` 与 `docs/scan-scope.md` 描述：产品解析一份 `ResolvedQualityConfig`，先形成 normalized inventory，再为 scanner 选择 exact inputs。活动决策 `configuration/use-bun-typescript-project-definition.md`、`product-contract/use-runtime-resolved-check-and-record-core.md` 与 `configuration/use-file-policy-overrides.md` 分别确定未来 Project Definition、运行时 Check/Record 和文件覆盖方向；它们目前是 `active + unaligned`，因此本 Change 实施这些方向，不把它们误写成现行实现。

实施依赖按 `establish-check-record-core` → `adopt-typescript-project-definition` → 本 Change 收敛；`establish-check-task-orchestration` 可以在同一基础链路中先行完成，但文件政策解析本身不创建 Task。依赖 Change 必须先提供 frozen Check catalog、Check-owned serializable policy schema/validation seam，以及一次性 Project Definition normalization；本 Change 不反向复制这些 owner 的完整契约。

## Goals / Non-Goals

**Goals:**

- 由一个公共 resolver 确定 glob matching、declaration order、closed structural patch、freeze 与 provenance。
- 由 producing Check 拥有 base policy schema、可覆盖 leaves、semantic post-validation 和 cache/result projection。
- 保持全局 inventory 先于文件政策，且 current/reference 对相同 project-relative path 使用同一快照。
- 为用户提供复用实际 resolver 的可解释结果。

**Non-Goals:**

- 不重新设计 Check/Record、TaskPlan、Project Definition 加载或 DecisionPolicy evaluator。
- 不把任意函数、runner binding、scanner dependency、acceptance、report、artifact/cache path 或 scope rule放进 file patch。
- 不为 feature policy 建立 JSON config v2、JSON Schema 或独立 merge engine。
- 不让 explain operation 证明文件存在、属于 inventory 或会被某项 Check 实际执行。

## Decisions

### Intended Change

#### Decision 1: 依赖 seam 完成后一次接入

本 Change 只在 Check catalog 与 Project Definition normalization 已有可依赖 seam 后实施。Normalized Project Definition 提供每项 resolved Check 的完整 base policy、policy schema metadata 和有序 file declarations；私有 runner binding 不进入 policy data。依赖尚未落地是实施顺序，不是本计划的开放设计问题。

#### Decision 2: Patch 从 Check-owned schema 派生

每项 Check 的 policy owner 在同一 serializable schema source 上标记 overrideable 与 base-only leaves。公共 projection 将 overrideable object children变为 optional，保留原 leaf validator 与描述；object patch closed，array 作为 typed leaf 整体替换。每个 declaration 必须有唯一非空名称、非空安全 project-relative glob 列表，以及至少一个按 resolved `checkId` 归属的非空 patch。

Unknown check、unknown key、`null` deletion、函数、任意 executable value、backend/tool field、空 patch、非法或越界 glob 均在任何 Check work 前失败。Selected base 中没有某项 optional Check policy 时，override 不能从 Product neutral definition 或其它默认值补造该 policy。

#### Decision 3: 公共 resolver 只做共同 structural semantics

Resolver 对 normalized project-relative path 使用与 scan scope 相同的 glob matcher，按 Project Definition 声明顺序收集 matches；对同一 Check 从完整 base policy 开始，递归替换声明 leaves，array whole-replace，后匹配 declaration 对同一 leaf 生效。结果经过 Check-owned semantic validation 后深冻结，并保存 ordered matches、declared leaves 与 winning source provenance。

公共层不解释 Check 专属字段，也不允许每项 feature 定义自己的 precedence 或 merge algorithm。Check owner 可以拒绝跨字段关系不合法的最终 resolved value，但不能改变公共匹配顺序或把 patch 当作可执行代码。

#### Decision 4: Scope 先形成，文件政策只能缩小

Product Core 先按现行 scope owner 形成 global normalized inventory，再为其中每个 entry 解析各 Check 的 file policy。Check 可以依据自己的 resolved policy 将 entry 从 exact inputs 排除，不能创建新 inventory entry、重新遍历 project root 或恢复已排除/generated/vendor path。

Current 与显式 reference 都使用 invocation 开始时从 current project 加载并冻结的同一 Project Definition 和 declaration snapshot；匹配 key 始终是 logical normalized project-relative path，不使用 reference checkout 的宿主路径。Reference 中不存在的 path 没有工作项，但同名 path 的政策值不因 materialization location 变化。

#### Decision 5: Cache 与执行只消费 owner projection

需要缓存的 Check 必须由自身 owner 从 resolved policy 投影会改变结果的 serializable leaves，并与 exact inputs 共同形成 cache identity。Override 名称、只改变 provenance 而不改变 resolved value 的 authoring 变化，以及其它 Check 的政策不进入该 cache key。公共 resolver 不通过 hash 整份 Project Definition 代替 owner projection。

#### Decision 6: Explain 复用正式选择、加载和 resolver

`explain-config [project-root] <path>` 复用正式 project-root、Project Definition selection/evaluation、normalization、glob matcher 与 resolver，并输出 selected source、normalized candidate path、按顺序命中的 declaration、所属 Check、declared/winning leaves 和完整 resolved policy provenance。它可以解释尚不存在的 candidate path，因此必须显式显示 inventory membership 为“未检查”，不能暗示会被扫描。

该 operation 会按 Project Definition 的受信任代码边界加载项目 module，但不建立 Check execution plan，不启动 scanner、baseline、cache、artifact 或 network work。本 Change 只提供人读输出；没有已识别 machine consumer，不新增序列化 contract。

### Resulting Impacts

- resolved policy 必须在任何 Check work 前完成 glob、owner、shape 与 semantic validation，并保持 frozen provenance 可解释。
- global inventory、current/reference、cache projection 与 `explain-config` 必须使用相同的 normalized path 和 invocation snapshot；override 不得重新纳入排除路径或让无关配置导致 cache 失效。

## Risks / Trade-offs

- **Schema projection 与 Check semantic validation 漂移。** 使用同一 Check policy schema source 生成 base validator、patch projection 与 authoring declarations，并覆盖 nested object、array、unknown/base-only leaf tests。
- **Document order 让重排具有行为影响。** 在 authoring docs 与 explain output 明示 later-wins，并保持解析后的原始 declaration order。
- **Per-path resolution 增加大项目开销。** 只做 invocation-local、按 normalized path 的 immutable memoization；没有 profiling 证据前不引入跨 invocation cache。
- **Custom Check 试图把函数放入 policy。** Project Definition normalization 只接受 owner-validated serializable policy data；opaque function 只存在于明确 execution binding slot。
- **Explain 被误认为安全 sandbox。** 输出明确指出它会执行受信任 Project Definition，且“不运行 Check”不等于“不执行项目 module”。

## Open Questions

无。依赖 Change 的实际 public type 或模块名可以在实施时按其稳定 seam 映射，不改变本 Change 已确定的 ownership、patch、resolution、scope、reference 和 explain 语义。
