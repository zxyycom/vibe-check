# Design

以调用方实际填写义务为单位调查可省略字段，在输入 owner 默认化中性值而保留完整事实与显式授权边界。

## Context

- 本轮用户授权为系统调查并建立独立 Change；不批量实施。`changes.flags.<id>.exclude` 的[现行契约](../../docs/api-mechanics.md#按文件变化选择-check)已允许省略：省略补齐冻结 `[]`，include 仍必填，自有 undefined/null/非法值仍拒绝。
- [package root](../../src/index.ts) 是公开 inventory；[API 机制](../../docs/api-mechanics.md) 与各 Check/工具指南拥有行为，声明拥有精确签名。
- `defineConfig` 的输入对 checks、outputs、scheduler 使用可省略字段；返回的 `ProjectDefinition` 则是完成态。`RunControls` 全部字段已有 omission 语义。Check constructors 的 partial authoring 与完整 `.options` 必须分开。
- 调查于 2026-10-05 读取当前源码、owner 和直接相关活动 Decisions，并运行不执行 Check、不读项目输入或建立产物、不请求网络的 constructor/纯 helper probes；详细依据见 [inventory](inventory.md)。证据不代表全量测试或 package artifact 验收。
- 新增高置信候选为 `reconcileFindingWaivers(...).waivers` 一项；五个字段仍需设计判断。安全读取 scope、运行预算、semantic identity、显式 DSL discriminator 等保留必填。

## Goals / Non-Goals

目标：减少重复填写 `[]`、`{}` 或固定 literal 的实际负担；显式输入保持原语义；每个可省略字段有唯一 default owner、兼容分析和可执行验收方向。

非目标：统一所有 input 为 `Partial`；让安全/身份/预算字段无条件 optional；改变 resolved、callback context、结果 DTO 或 machine schemas；设计新的配置框架；批量修复、创建长期 Decision/Investigation、推动本 Draft 为 Plan 或结项。

## Decisions

### Intended Change

1. **已确认的调查结论**：`waivers` 当前强制，`[]` 已得到全部 actionable findings 和空 audit；省略可以表达同一中性值。建议将其作为最小先行候选，不默认化 `findings` 或 `identify`。这是候选推荐，不是已获实施授权或已生效契约。
2. **暂定实现方向**：将来批准后，在 helper 的 waiver materialization 前处理 absence，再复用现有 canonical array validation；不要把非法显式输入改成无 waiver。明确 own `undefined` 是否同 omission；`null`、sparse/accessor/hostile arrays、重复 identity 与空 reason 继续拒绝。
3. **待判断范围**：三个 `codeAreas.<id>.files` 的 `{}`、collector 的空 exclude、bundled schema 的唯一 catalog literal 有可见填写负担，但分别受显式区域、完整 selection 与 catalog pinning 契约约束；先回答 [inventory](inventory.md) 的问题，不与高置信项捆绑。
4. **保留边界**：完整 `ProjectFileSelection`、resolved options 和 graph DTO 不直接改成 partial。存在默认 factory/helper 就优先核对实际输入；owner 有意强制的字段先保留。
5. **已落实先行项**：`changes.exclude` 的 public optional input、完整 normalized region 及 omission/explicit `[]` 的 selection/fingerprint 等价已由[Definition owner](../../docs/development/project-definition.md#project-changes)承接，当前源码与之保持一致；它不属于本 Draft 的候选、待决或实施范围。先行项的验证交接见 [inventory](inventory.md)。

### Resulting Impacts

- **类型与 runtime**：仅增加 input 接受范围；旧显式 `[]` 等仍有效。未来需要 authoring type acceptance、invalid-value rejection 和 resolved completeness 的独立证明。消费 `ReconcileFindingWaiversOptions["waivers"]` 的外部代码会见到 `undefined`，属于声明兼容影响，不能仅按“更宽 input”忽略。
- **安全与失败**：无 waiver 默认不会增加豁免或隐藏 finding；`findings` 必须完整且 `identify` 继续验证每项 identity。collection/area defaults 可能扩大读取、区域重叠或跨区域比较，默认 catalog 的演进可能改变 validation；这些影响需要单独批准。
- **身份**：waiver helper 没有 Definition fingerprint 或 persistent cache；调用方如何使用其结果仍由调用方负责。area/catalog 若 optional，省略必须物化为与对应显式默认相同的完整 options，核对 canonical snapshot、fingerprint 与 scanner/cache identity，不新建 omission-specific identity。
- **公开说明**：未来修改 waiver 指南、类型 JSDoc 和代表性 usage；若批准其它字段，同步各 Check/collection/schema owner。内部 owner 承接默认化责任，不能以只改内部说明替代用户材料。
- **验证与审查**：未来在最窄相邻测试、authoring 类型证据、installed consumer 与文档材料中验证默认/显式/非法三路；实际行为 diff 的文档影响需非实施代理反查。本轮没有这些产品证明，只执行 Draft 与局部材料检查。

## Risks / Trade-offs

- 空容器只说明字段填写负担，不自动说明默认语义值得开放。三个 area 的既有活动 Decisions 显式要求 files branch；改变这一点可能需要修订长期判断，当前 Draft 不作该决定。
- `collectProjectFiles` 与 `secretDetection` 当前接受同一完整 selection，不代表两者默认责任可合并：前者是独立显式工具，后者是安全读取授权；不从共享类型推导共同 optional policy。
- `catalog` 当前仅一个 literal，但 omitted default 若未来随 package 切换 catalog，会抹掉调用方的显式 pin；保留填写成本可能是可接受的兼容保护。
- 泛型 helper 省略 waiver 后仍计算/验证 finding identity；这比绕过 reconciliation 或直接透传更稳，但调用方若只需要原 findings，也不必调用工具。
- 调查覆盖当前 package-root 常见 authoring 面，不审计任意外部 wrapper、历史发布包或所有 callback return grammar，不声称穷尽所有公开必填字段。

## Open Questions

1. 是否批准仅把 `waivers` 作为下一实施切面？own `undefined` 是否与 omission 同义（推荐同义），需要怎样保留外部 named-options consumers 的类型兼容说明？
2. 是否愿意改变三个 area 强制 files 的既有 Decision？若允许省略，必须分别采用各 owning Check 的默认 selection，不能把 function metrics 误用全文件基线。
3. collector 是否继续要求完整 selection？允许省略 exclude 时，空排除与公共 baseline 的常见排除应选哪一个？建议此两种语义不得混用。
4. bundled `catalog` 是需要稳定显式 pin 的 policy，还是可省略且长期固定为 2020-12 的 authoring 冗余？未来多个 catalog 时 omission 的迁移规则应先明确。
