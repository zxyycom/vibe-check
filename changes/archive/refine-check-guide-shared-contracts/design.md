# Design

本 Plan 以 published owner 的最小收敛消除真正重复的 consumer 规则，同时让每个 Check guide 对其不可替代 contract 保持自足。

## Context

- `docs/development/project-files.md` 已拥有内部 collection/exact-input mechanics，但不是随 package 发布的 consumer owner；不能让 package Check guide 以它替代 user-facing contract。
- 目标四项 Check 的共同 files 核是 `{ source, include, exclude }`、两种显式 source、project-root-relative slash glob、exclude precedence、显式数组替换与 source failure 不回退。README 已是 package 的唯一总入口，适合承接此已发布共同核。
- `codeAreas` composition/defaults、function reader acceptance/rejection、secret 的 required top-level authorization、bounded coverage 与 sensitive-material handling 是稳定差异。
- `finding-waivers` 已拥有 generic helper 的 canonical identity、complete-set reconciliation、0/1/many audit 与 helper boundary。四项 Check 都在完整候选 Finding 后采用该过程，但各自拥有 identity、Record/message/status 与安全限制。
- external scanner parser、private analyzer/detector adapter 和 `parse…Data` 的 final-data parser 分别服务不同 inputs、failure 与 output contracts；它们没有可安全抽取的共同 consumer contract。

## Goals / Non-Goals

**Goals**

- 把已验证的 files core 与 waiver core 放到现有 published owner，并让 four guides 链接到它们。
- 让 consumer 从每个 Check guide 仍可恢复 fields/defaults、identity、scope、rejection、unavailable 与 security boundary。
- 明确记录 parser 维持 local 的理由，避免为篇幅建立虚假的 generic parser/file-tool abstraction。

**Non-Goals**

- 不改变 product behavior、Check options、default values、Record/final-data shapes、waiver disposition、scanner/analyzer/detector protocol 或 test evidence。
- 不新建 public file tool、guide、inventory、link dependency 或 Product-wide file configuration。
- 不重做既有 README/API/docs owner 整理，也不修改 internal project-files 或 scanner-dependencies owner。

## Decisions

### Intended Change

- README 增加一段仅覆盖共同 selector core 的说明，并明确 fields 的 placement/default/eligibility 继续以 linked Check guide 为准。
- `finding-waivers` guide 集中共同 authoring/reconciliation/audit 规则；目标 Check guides 链到它，仅说明本 Check 的 native option、identity grammar、scope 与 effect。
- 以相同层级、失败和 consumer operation 检验 parser candidate：external report parser、function private analyzer 与 secret detector/final-data parser 均不满足共同契约，故不抽取、不新建 owner。
- 实施范围仅为上述文档与 Change artifacts；用户已授权验收后归档本 Change 并单独本地提交。

### Resulting Impacts

- 所有相对 link 以 published package layout 校验；README heading anchor 必须由 target guides 可解析。
- README 的 selector core 保持短小，避免吸收 metrics area policy 或 secret security authorization；各 guide 本地示例与边界不删除。
- `finding-waivers` 的 shared text 必须说明 helper 不拥有 terminal effects；各 guide 继续说明 applied/audit Record、message、count 和 blocking effect。
- docs validation 覆盖 links 与 package material；Change Plan check 覆盖 artifacts、task progress 和 Plan baseline。不会以这些机械检查代替后续独立文档影响审查。

## Risks / Trade-offs

过度抽取会强迫 consumer 跨页重建 default、security 或 unavailable semantics；因此只移动词义完全一致的 core，并在 local guide 留下明确链接和本地例外。保留 parser 说明会维持少量表面重复，但避免错误暗示 adapters 或 final-data parsers 可互换。README 增加一段会扩大入口责任，但不新增页面、inventory 或 public capability，且它正是 package 的稳定总入口。

## Open Questions

无；实施范围、共同 owner 与保留差异已由当前用户批准。未来若出现获批的 public file tool，应以独立 Change 按其实际 API 和 package-material impact 重新审阅本关系。

## Implementation Observations

独立正确性审查以实际 diff、selector collection、waiver reconciliation 和四份随包 guide 为起点，确认 README 只承接共同 grammar，`finding-waivers` 只承接共同 reconciliation/audit；没有把 metrics area、function reader、secret authorization/coverage 或 parser 当作全局契约。最终 AI-ready 审查保留现有结构：目标 consumer 可从 README 或各 guide 进入正确 owner，且本 Change 不依赖 internal documentation 才能完成配置任务。

2026-09-07 最终独立运行 `bun run check` 通过：candidate `0.0.0-local.926808c01f43`，31 passed、5 not applicable、0 failed/unavailable，13.4s。日志标识为 `2026-09-07T09-25-41.710Z-229660-21535962-d365-40de-9eef-12fdf51ffe37`。本次未选择 package acceptance；该记录与冷态调查以及误触的 Gate 分开。
