# Design

本设计用 location area 交集恢复比较域语义，并把项目扫描范围与长期 advisory 政策收敛到对应 owner。

## Context

当前 duplicate adapter 已按 area 收集 exact paths、去重后只启动一次 jscpd，再在 `area-policy.ts` 恢复 location 对应政策；因此可以在后处理阶段隔离 area，而不增加进程、缓存层或公共配置。Project Gate 自有 `repositoryFileDefaults` 已排除 `**/archive/**`，公共 `defaultProjectFileSelection` 则只排除跨项目普遍稳定的生成物、依赖和工具状态。historical v2 Schema 仍由 documentation task contract 显式登记并严格验证。

## Goals / Non-Goals

**Goals**

- 让 `codeAreas[id]` 同时拥有 duplicate 文件范围、比较边界、阈值和 finding policy。
- 保持单次 scanner、exact-input containment、cache identity 和 waiver identity 不变。
- 删除无整改价值的项目质量输入，同时保留 historical compatibility evidence。
- 让日常与发布前质量 Finding 都保持 advisory。

**Non-Goals**

- 不向公共文件基线加入 `**/archive/**` 或项目治理目录。
- 不增加 comparison group、跨 area 开关、per-area scanner、Markdown duplicate checker 或 release-specific Finding evaluator。
- 不用 waiver、提高阈值或静默修改 scanner output 掩盖仍属于同一比较域的 Finding。

## Decisions

### Intended Change

1. 为每个 raw fragment 取得每个 location 的 area ID 集合，并计算集合交集。交集为空时 fragment 不属于任何完整比较域，因此不形成 Finding；交集非空时 Record 的 `codeAreas` 恰为排序后的共同 area。同一路径同一区间重复出现不是两个位置，整批 scanner result 按不可信结果拒绝。
2. 阈值只取共同 area 的 `minimumLines` 与 `minimumTokens` 最大值。scanner 仍使用全部实际 area 的最低阈值取得候选，保证后处理拥有足够事实；一次 invocation 仍只执行一次 jscpd。
3. Project Gate 删除 `docs-specs` duplicate area；`docs/**/*.md` 与 `changes/**/*.md` 继续进入 file metrics 和 Markdown link validation，但不进入 CPD。
4. Project Gate 在 `schemas-examples` 的 duplicate/file selections 中追加 `docs/schemas/historical/**` exclusion，并删除历史 v2 file waiver。documentation validators 继续通过显式 historical registry 验证这些文件。
5. 新 Decision 修订 duplicate area 语义；另以 successor 替代历史 waiver 和发布前强制处置决策。实施完成并验证前先保持 unaligned，完成后再标记 aligned。

### Resulting Impacts

- 现有跨 area 测试必须改为同时证明互斥 area 被过滤、显式 shared area 保留 Finding，并证明相同 range 的 scanner 自我匹配被拒绝；Record 不再把仅覆盖部分 location 的 area 标成 finding area。
- area 配置和 cache 的 public shape 不变，属于行为语义修订；README 无需增加新 option，但 duplicate guide、scan-scope、JSDoc 和适用 Case 必须同步。
- repository-quality config test 不再期待 historical files 被质量指标选中或 file waiver 存在，改为证明质量排除与 current Schema 保留。
- `require-known-repository-quality-remediation-before-public-release` 的 successor 只移除质量 Finding 清零要求，不削弱 exact candidate、真实 consumer、registry authority 或外部写入授权。

## Risks / Trade-offs

- consumer 过去依赖跨互斥 area Finding 时会观察到数量下降；用一个同时覆盖相关路径的 area 可以显式恢复该比较意图。
- 单次 union scan 仍会让 jscpd 计算最终被 area 交集过滤的 fragment，但避免多进程、重复文件读取和 cache 模型扩张。
- 从 historical quality metrics 排除后不再保留 SCC/jscpd 对历史材料的测量证据；其真实性改由更直接的 strict schema validation 和历史身份约束承接。

## Open Questions

无。用户已确认 Markdown 不进入 CPD、area 隔离、historical 退出可维护性指标，以及发布前 Finding 仍为非阻断提示。
