# Proposal

本 Change 让 duplicate area 成为实际比较边界，并让仓库质量提示只覆盖适合通过维护动作改善的材料。

## Why

`duplicateDetection` 当前把所有 area 文件合成一次 jscpd 输入，并把跨 area 片段也结算为 Finding；因此分别属于 Product 与 repository scripts 的实现仍被混合比较。仓库 Gate 还把 Markdown 和不可改写的 historical Schema 交给重复或文件规模指标，产生不能指导可靠整改的提示。既有发布决策又把开发期 advisory Finding 升格为发布前处置要求，与项目确认的非阻断政策不一致。

## Outcome

每项 duplicate Finding 至少属于一个覆盖其全部 location 的共同 area；仓库 CPD 不扫描 Markdown，historical Schema 只接受完整性验证而不进入可维护性指标，质量 Finding 在日常 Gate 与发布验收中都保持非阻断提示。

## Scope

### Intended Change

- 保留一次 jscpd exact-input 并集扫描，但只让 location area 集合存在非空交集的 fragment 形成 Finding，并只使用共同 area 的阈值与政策；同一路径同一区间的 scanner 自我匹配作为不可信结果拒绝。
- 从 Project Gate duplicate 配置移除 Markdown area，从 duplicate/file metrics 排除 `docs/schemas/historical/**`，并删除因此失去必要性的历史 file waiver。
- 用长期 Decision 修订跨 area duplicate、historical quality scope 和发布前 Finding 政策，同步公共指南、项目 owner 与直接测试。

### Resulting Impacts

- 跨互斥 area 的 raw fragment 仍可由单次 scanner 观察，但不会进入 Finding、Record、message 或 final count；重叠 area 仍按共同 area 的严格阈值结算。
- 希望跨目录比较的 consumer 必须显式声明一个同时选中所有 location 的 area；不新增 comparison group、额外 scanner invocation 或新 option。
- Project Gate 不再为 Markdown、historical Schema 或 Product/scripts 跨 area 相似产生 duplicate Finding；historical Schema 的显式 strict validation 保持不变。scanner 自我匹配不会形成伪 Finding。
- repository quality Check 继续使用 `non-blocking`，公开发布不新增 Finding 清零或 waiver-audit 门禁。

## Success Criteria

- duplicate direct tests 证明互斥 area 片段被过滤、共同重叠 area 片段被保留、scanner 自我匹配被拒绝，并且 scanner 仍只启动一次。
- 公共文档明确 area 是比较边界、共同 area 的阈值与政策决定 Finding，不再描述跨互斥 area 比较。
- Project Gate 配置和测试证明 CPD 不选择 Markdown、duplicate/file metrics 不选择 historical Schema，且历史 file waiver 已删除。
- 三项长期政策与当前实现、文档和验证事实一致；目标测试、测试证据、Decision/Change、文档与 required workspace 验证通过。

## Affected Owners

- `docs/checks/duplicate-detection.md`、`docs/scan-scope.md` 与 `src/package-checks/duplicate-detection/**`。
- `scripts/project/gate/definition.ts`、repository-quality adapter tests 与 `docs/script-tooling.md`。
- `docs/decisions/**`、`docs/testing/cases/**` 与 package documentation acceptance。
