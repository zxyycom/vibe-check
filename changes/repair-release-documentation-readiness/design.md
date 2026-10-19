# Design

按互斥文件切面实施已确认的文档修复，再以非实施代理和实际消费者验证收敛。

## Context

起点为干净 main `1ba40f65`。上一轮普查覆盖 625 篇 Markdown，29 篇随包文档逐篇审阅；依赖审计示例已用安装候选复现 `execution-threw`。初始授权为子代理修复；后续用户要求再次按 ai-ready-docs 优化后提交，允许必要的多次提交及 hook 导致的推送。授权仍不包含 package 发布或 Change 删除。

## Goals / Non-Goals

目标是恢复当前用户任务与知识回放的准确性；不新增产品功能，不改运行时 API，不批量删负向条款、拆长文、改写历史测量或清理无关计划。

## Decisions

### Intended Change

- 用户文档切面拥有 README、公开专题/Check 指南、相关示例源和投影接线。
- 发布与维护切面拥有 changelog、当前协调/说明、目标 Case 与 Network Plan；不写知识索引。
- 知识切面独占 Decision、Investigation 和其索引；按现有 owner 校对长期方向及正文，不用统一归档代替语义判断。
- 主代理拥有本 Change、跨切面协调和集成验证；实施完成后独立代理只读反查实际 diff。
- 提交前第二遍审查由独立代理覆盖 29 篇公开页与本轮内部改动，主代理只实施有明确阅读收益的局部调整，再交回独立复核。

### Resulting Impacts

- 共享投影写入与全量验证串行执行，防止把正在变化的材料当最终证据。
- 实质 Decision 替代须先核对后继自包含与关系，执行前交接预检给主代理；无变化的长期理由只作局部说明纠正。
- 历史资源默认供复核，路径更正不授权重跑或覆盖证据；当前许可与状态回到当前请求及相应 owner。
- audit 投影令根 registry 超出文件规模门槛后，将同属 Gate 构建指南的十个连续条目提取为子分组；根 registry 仍拥有唯一完整入口和顺序，不新增默认语义、通用 builder、阈值或 waiver。
- 子分组和根 registry 一起进入 artifact fingerprint 的显式文档输入；扩展既有 mapping fingerprint 测试及其 Case 证明，而不新增测试实体。

## Risks / Trade-offs

正文收敛可能误删安全边界，故保留精确规则并在独立审查中反查。安装包验收证明新材料，而不证明所有历史实验；活动判断中的旧细节须区分真实方向演进与同方向的示例漂移。

## Open Questions

无影响优化和提交的用户待决项。Change 完成态将保留；后续删除仍须单独授权。若知识修复要求采用新的产品方向或不可恢复的删除，应停止该项并另行确认。

## Implementation Observations

- 三个实施切面已完成；公开文档与维护/知识由另外两名代理独立复查。知识复查提出的 Definition membership 歧义与 SCC 路径 identity 表述已定向修正并复核通过。
- Decision 通过正式 CLI 为 Gate 聚合与 pinned-tools 建立真实修订关系，保留两个归档前序；其余正文修正及两份派生索引已同步。没有物理删除历史记录或重跑历史实验。
- 在项目锁定 Bun 1.3.14 下，`docs:api`、投影 renderer/command 三项测试、scripts typecheck/lint、public inventory 与 strict consumer fixture 两项窄测试通过。未固定 Bun 1.4.2 的 inventory 深比较曾失败；切回项目 runtime 后通过，未修改测试或产品来迁就未支持的运行条件。
- `validate`、`test-evidence -- check --root .`、`decisions -- check`、`investigations`、`change-plan -- check-all changes` 与 diff whitespace 检查通过：756 entities / 188 Cases、371 Decisions、87 Investigations、15 Changes。
- 首轮 `bun run check -- --all` 为 42 passed / 1 failed；新候选的 artifact、external types/documentation/runtime 已通过，唯一失败是 projection registry 513 code lines 超过 500。已按上节提取指南分组；33 项注册内容、顺序与递归冻结状态前后相等，窄检查重新通过，第二轮 Gate 43/43 passed。
- 独立审查进一步发现子分组尚未进入显式 fingerprint 输入；现已补接线及既有 Case 的回归证明。先仅加断言观察失败，再补输入通过；原测试身份不变，最终九项目标测试、完整 Case 闭合及独立复核均通过。
- 最终新候选 `0.0.0-local.2a4bf363cb17` 的 `bun run check -- --all` 为 43/43 passed（30.9 秒），含 artifact、external types/documentation/runtime；日志位于 `.log/project-gate/2026-10-19T04-06-18.999Z-655332-7dc37e52-1289-4836-a247-6837803c8364/`。全程未放宽预算或加入豁免。
- 上述证据证明当前工作树和本地安装候选；未重跑历史性能实验，未执行正式 package 发布准备、远端 package 发布或跨平台新增认证。产品源码、API、依赖与锁文件未改变。
- 第二遍优化清除构造器现行叙述和 JSON Schema 排障中的迁移残留；文件选择迁移说明归回 changelog，Case 多信号拆为独立 bullets，Network acquisition 分清能力与恢复步骤，调查答案移入结果章节并展开长表。没有改变历史数字、关系、Case 身份或安全门槛；两名非实施代理已复核这些局部优化，无剩余阻断。
- 提交前最终候选 `0.0.0-local.b050b56f8768` 的完整 Gate 43/43 passed（40 秒），日志位于 `.log/project-gate/2026-10-19T04-35-36.956Z-667695-bb6aa4da-adb1-4f5a-a6ce-2d7db0d9d373/`。单项时长均值 2378.9 ms、P95 7565.2 ms 超出本机 warning budgets，产生非阻断提醒；未改变门槛，也不把本次结果当性能改进证明。投影、validate、Case、Decision、Investigation 和全部 Change 检查再次通过。
- 本 Change 的基线保持 `1ba40f65`。提交在 main 按语义单元整理，不绕过已启用的非强制 post-commit hook，也不主动扩张为手动推送、发布或 finalize。
- 实施改动已分别保存为 `643b6a2c`（公开文档与示例验收）、`80466ea7`（维护说明与暂停计划）、`f5a01847`（知识记录）。首个提交的 hook 成功推送至 `origin/main`；后两次因一小时冷却跳过，未手动补推。本完成态单独提交，Change 目录继续保留。
