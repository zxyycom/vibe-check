# 决策与 Change 治理

本文档是项目级长期决策与 OpenSpec change 治理的 owner：定义当前事实、长期方向和
change artifacts 如何共同支撑判断与实施，以及阶段转换、内容同步和一致性校准。Skill 的
项目维护文件与工具边界由 [脚本工具](script-tooling.md#项目级-skill-维护)拥有。

## 载体与权威性

| 载体 | 核心职责 |
| --- | --- |
| `docs/` owner 文档 | 已成为当前基线的稳定行为、public contract、职责边界和验证语义。 |
| 代码、测试和 release artifact | 当前实现状态及其可执行或可发布证据。 |
| `docs/decisions/` | 已确认且跨 change 仍有长期影响的方向、理由、约束和演进关系。 |
| `openspec/changes/<change>/` | 服务该 change 当前阶段的探索依据、设计、`## Decisions`、任务、验收依据和审计历史。 |

`openspec/specs/` 是 capability specification 的 OpenSpec 工具视图。各条决策 Markdown
拥有全局决策内容、生命周期、`alignment` 和关系；`decision-index.json` 是可重建的查询视图。

## 活动决策与当前任务

活动决策已经确认。`aligned` 表示完整方向已与相关当前事实核对并建立为持续基线；
`unaligned` 表示已经确认、尚待未来实现的方向。`alignment` 记录方向与当前事实的关系，
当前请求提供本次实施范围和优先级，决策正文提供未来先后关系。

相关工作按以下方式使用活动决策：

1. **已对齐继续**：当前事实与活动决策一致时，按已建立的基线和约束执行。
2. **未来方向输入**：未对齐方向与当前任务相关时，在完整满足当前任务的可行方案中优先选择
   保留该演进路径的方案；实施工作保持在当前任务明确要求内。
3. **实施未来方向**：当前任务明确要求实施未对齐方向时，将决策正文与当前事实共同作为实现依据；
   完整满足后核对事实并标记为已对齐。
4. **一致性处理**：活动决策互相冲突，或已对齐基线与当前事实偏离时，先报告一致性问题；
   长期方向发生变化时通过新的决策及演进关系维护。

活动决策的恢复、写入和生命周期维护使用项目内的 `$decision-records` skill 与
`bun run decisions -- <command>`。

## OpenSpec change 阶段

| 阶段 | 当前 artifacts 承接的内容 | 进入下一阶段的条件 |
| --- | --- | --- |
| 探索（`$openspec-explore`） | 目标、范围与非目标、关键边界、依赖、风险、证据、开放问题、启动条件和高层验收方向。 | 当前请求要求进入实施准备，且方向与关键约束已经收敛。 |
| 实施准备（`$openspec-propose`） | 基于当前 owner、活动决策、实现状态和已落地依赖形成设计、任务与验收依据，并设置阻塞级审计任务。 | 开放问题已收敛，仍需使用的 artifacts 与当前事实一致，阻塞级审计完成。 |
| 实施（`$openspec-apply-change`） | 按当前任务授权逐项完成 tasks，同步 checkbox，并运行范围匹配的验证。 | 任务与验证完成，形成的当前基线和长期方向变化已经识别。 |
| 收敛与归档（`$openspec-archive-change`） | 将稳定结果同步到行为 owner 和实现证据，将长期方向变化维护为决策演进。 | 验收与同步完成后，当前任务明确包含归档。 |

`applyRequires` 全部为 `done` 表示 OpenSpec 要求的 artifacts 已完备。实施从当前任务授权、开放问题
收敛、artifacts 与当前事实一致以及阻塞级审计完成后开始。

已形成详细 artifacts 的 change 暂停时保留形成时的审计上下文。恢复时重新核对当前 owner、
活动决策、实现状态和仍需使用的 artifacts，再从对应阶段继续；其他暂停 change 保持其历史上下文，
等到恢复或实质修改时再按当前阶段收敛。

## 内容归属与同步

1. 只约束一个 active change 的判断写入该 change 的 `## Decisions`。
2. 已确认且跨 change 仍有长期影响的判断写入 `docs/decisions/`。
3. 已成为当前稳定规则的结果写入对应 `docs/` owner 文档。
4. 当前实现及其证明由代码、测试和 release artifact 承接。
5. change 收敛后按以上归属同步，再完成验收和归档。

载体出现差异时，分别从对应 owner 恢复：当前稳定规则看 owner 文档，当前实现看代码、测试和
release artifact，未来方向看活动决策，当前实施计划看 active change。确认差异后更新失配载体，
保留每类信息的单一 owner。

## 验证

- 决策 Markdown、生命周期、关系或索引变化：运行 `bun run decisions:check`。
- OpenSpec artifacts 或主 specs 变化：运行对应 change/spec 严格验证。
- 本文档或路由变化：运行 `bun run validate:docs`；跨多个工作流边界时运行
  `bun run verify:vibe-check-workspace:required`。
