# 决策与 Change 治理

本文档是项目级载体分工与 Decision、Change 协作规则的唯一 owner：定义当前事实、长期方向和
单次实施计划怎样共同支撑工作，以及 Change 收敛后怎样同步和核对。它不定义工具的固定格式或
生命周期机械契约；这些内容分别由 `decision-records`、`change-plan` 和 `investigation-report`
skill 拥有，项目安装与命令接线由[脚本工具](script-tooling.md#governance-and-test-evidence-adapters)拥有。

## 载体与权威性

| 载体 | 核心职责 |
| --- | --- |
| `docs/` owner 文档 | 已成为当前基线的稳定行为、public contract、职责边界和验证语义。 |
| 代码、测试和 release artifact | 当前实现状态及其可执行或可发布证据。 |
| `docs/decisions/` | 已确认且跨 change 持续有效的方向规格、理由、约束、对齐状态和演进关系。 |
| `changes/<change>/` | 一个当前 change 的 proposal、design、tasks、验证、Git 基线和生命周期状态。 |
| `docs/investigations/` | 用户明确要求沉淀时，保存特定时点的调查认识、依据、边界与可选随附资源。 |

长期决策可以直接作为后续 change 的方向规格，但不复制当前实现，也不自行产生优先级、任务、
授权或验收完成事实。Change Plan 是可持续改写的临时实施上下文，不成为稳定事实或跨 change
方向的第二 owner。`decision-index.json` 和 investigation index 都是可重建查询视图。

一个方向成为当前基线后，Decision 保留“为什么采用”，对应 `docs/` owner 保留“当前如何工作”；
两者职责不同，不互相替代。普通文档只有在拥有独立当前契约、任务入口或验收责任时才单独保留；
否则并入对应 owner 或删除。

## Decision 与 Change 协作

活动决策的一般解释、任务关系分类、alignment、拆分和生命周期由项目内完整上游
[`decision-records` skill](../.codex/skills/decision-records/SKILL.md) 与对应决策记录拥有。本文只定义
Decision 与 Change 之间的项目级交接：

1. 进入一个 Change 前，运行 `bun run decisions -- list`，再按 `decision-records` 恢复会直接改变该
   Change 目标或结果的活动决策；当前请求决定本次授权，当前请求与 Change artifacts 共同限定
   交付范围。
2. Change 直接使用 `change-plan` 的 proposal、design、tasks 与 lifecycle，不为决策引用增加项目
   自定义字段、章节或平行清单。
3. 一条 `active + unaligned` 决策可以直接按已确认方向进入 Change 目标和 plan；当前请求明确把它
   纳入实施授权时再实施。开始 Change 前不预先修改 alignment，也不把未对齐本身当作退回探索的
   理由。
4. 一个 Change 可以落实一条或多条决策，一条决策也可以跨多个 Change 落实；Change 的任务完成、
   stage 转换或归档都不会自动改变决策状态。
5. Change 的稳定事实 owner 已同步且相关验证通过后，对直接相关的活动决策触发 alignment 核对；
   是否改变 alignment、是否需要拆分或演进只按 `decision-records` 的判断与命令执行。

## Change Plan 使用边界

需要跨文件、owner 或验证阶段持久交接的明确 change 使用 `$change-plan`。简单局部改动直接同步
owner、实现和验证；仍在探索的问题先继续探索，不为获得形式而预建空计划。

项目约定的根目录是 `changes/`；处理前使用 `bun run change-plan -- list changes` 定位当前计划，
再阅读目标 Change 的 proposal、design 与 tasks。`changes/` 根目录不维护手工 active Change 清单、
发布状态快照或跨 Change 事实副本；动态成员、stage、任务进度和 Git 距离以命令输出与目标
artifacts 为准。固定 artifact、严格 metadata、stage、Git 距离、命令门禁、授权检查和退出状态只由项目内
完整上游
[`change-plan` skill](../.codex/skills/change-plan/SKILL.md) 定义；package 入口见
[脚本工具](script-tooling.md#governance-and-test-evidence-adapters)。

同时推进多个 Change 时，从[Change 执行依赖与 Worktree 协调](change-execution-order.md)恢复跨 Change 的
硬前置、推荐合入顺序和共享 owner 冲突。该文档是依据当前 Change artifacts 维护的协调视图，不拥有 active
membership、stage、进度、暂停或实施授权；它与目标 artifacts 不一致时，先按当前事实修正协调视图，不能反向
覆盖目标 Change。

## 内容归属与同步

1. 已确认且跨 change 持续有效的判断写入 `docs/decisions/`；未确认草稿留在对话或 Change 中。
2. 只约束当前 change 的范围、设计、开放问题、任务、验证、进度、暂停原因和恢复条件写入对应 `changes/<change>/`；metadata 只使用上游 skill 定义的规范 stage，不以 stage 另建暂停状态。
3. 已成为当前稳定规则的结果写入对应 `docs/` owner 文档。
4. 当前实现及其证明由代码、测试和 release artifact 承接。
5. 用户明确要求沉淀的时点调查进入 `docs/investigations/`；形成下游方向或任务时交接给对应 owner。
6. Change 完成后先按以上归属同步，再完成语义验收；alignment 按“Decision 与 Change 协作”核对，
   归档只在当前任务明确授权后执行。

载体出现差异时分别从其 owner 恢复：当前稳定规则看 owner 文档，当前实现看代码、测试和 release
artifact，未来方向看活动决策，当前实施计划看 active Change，形成时认识看调查报告。确认差异后
更新失配的当前载体，不让非当前材料反向覆盖现行事实。

## 历史读取边界

只有任务明确要求历史审计、恢复形成时依据或比较演进时，才读取
[`archive/legacy/historical-openspec-materials.md`](../archive/legacy/historical-openspec-materials.md)
并按需进入其快照。历史内容不参与当前规范、计划或验证；恢复方向必须从当前 owner、活动决策和
实现证据重新建立基线。

恢复时不继承历史 lifecycle、任务完成状态或实现基线，但这不表示已经形成的计划内容必须退回探索。
经当前 owner、活动决策和实现证据重新核对后仍成立的范围、设计、任务与验证，应重建到当前 Change
的固定 artifacts，再通过 `change-plan` 的正常门禁确认 plan；只有失去依据或仍存在实质未决的部分
才重新探索。

## 验证

- 决策 Markdown、生命周期、关系或索引变化：运行 `bun run decisions -- check`。
- Change Plan 变化：运行 `bun run change-plan -- check changes/<change>`；生命周期操作按 skill 验证。
- 本文档或路由变化：运行 `bun run validate -- docs`；跨多个工作流边界时运行直接调用
  Project Gate 的 `bun run verify:vibe-check-workspace:required`。
