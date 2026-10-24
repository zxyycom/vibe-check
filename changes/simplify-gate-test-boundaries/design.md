# Design

第七版在既有实体内补强四处断言、删除一处重复证据，并以私有材料隔离 machine drift；以下设计说明当前调整、保留的观察和交付边界。

## Context

前六版已提交至 `c73ec649`。第七版从 clean main `25c75e36` 与 781 entities / 191 Cases / 16 topics 起点，按 test-design 普查改善测试质量；验证与未完成项集中在 [tasks](tasks.md#evidence)。前序设计从该提交的本文件恢复，稳定规则以 [proposal 的 owner 导航](proposal.md#affected-owners)为准。

## Goals / Non-Goals

当前目标是提高断言辨错能力、保留去重后的独立证据，并使漂移测试只写私有材料。代码调整限于测试及内部材料检查的可选读取根，文档按当前 owner 和计划职责整理。公开 API、生产默认值、生成写入、发布映射、Gate 资格、四项扫描、预算与统计口径保持不变。性能预算与冷集成扩大修复另行确定范围；完整 Gate 的功能和性能分别报告。

## Decisions

### Intended Change

以下为已实施的第七版方案，复用既有实体、Case 与生产入口：

| 边界 | 本轮调整 | 保留与移除的观察 |
| --- | --- | --- |
| Critical-path | 在原分叉图加入跨 `dependsOn` / `observes` 的两跳链，独立算例断言完整累计分数。 | 纯领域入口观察完整下游累计分数，可识别只累加直接 child estimate 的错误。 |
| File fingerprint | 相同文件数和字节下更换所选路径；LF、CRLF 与 CR 等价。 | 真实文件系统加既有 hash 入口分别观察路径身份和换行归一化。 |
| Release clean source | 同一真实 Git fixture 覆盖精确 root、tracked unstaged、staged-only、untracked，状态之间恢复健康基线。 | 保留实际 index/porcelain 语义，不以 Git mock 代替。 |
| Workbench output | 在原 CLI 调用后比较首次 evidence、已有文件、symlink 身份和目标字节。 | 保留调用方错误处理与重复写入路径；不增加 CLI 启动次数。 |
| 文档指纹去重 | 删除 package-documents 中全输入复制及重复 fingerprint 变体。 | manifest 测试保留 mapping/support/Gate projection 字节敏感性，compiler tests 保留真实工具链资格；不再证明实际全树复制与默认工具链组合的同一场景。 |
| Machine drift | 五份私有材料；schema/file checker 的健康基线与字节负例执行零次 Run，Definition 健康基线与单因素变化各执行一次真实 source public Run。 | 内部检查入口的 `materialRoot` 传到 Definition 读取、生成结果比较与 inventory 检查；默认读取根仍为正式材料，generation 写入入口保持原行为。 |

文档在 owner 完整表达稳定规则，计划保存本次取舍与证据。代码按[编码规范](../../docs/development/coding-style.md)复核完整变化模块及直接消费者，测试与临时 fixture 使用相同标准。

### Resulting Impacts

1. 四份 Case 同步增强的断言和去重后的证明范围；仅移除一个重复实体，保持 Case ID、其余实体身份与 Topic。材料指纹目的仍由已有 artifact Case 承接。
2. 输出维护 owner 记录内部读取根和漂移证明分工；Gate 仅保留 mutex 与 owner 引用摘要。CLI、生成写入入口和 package 发布映射保持原行为。
3. 按受影响边界串行验收：routine all 及显式 `--admission-workbench`。Workbench 通过既有 candidate binding 执行修改的 CLI 测试；Gate Check 身份、资格、timeout、runner 分组和 mutex 不变。
4. 本轮保留第六版冷 candidate 集成未完成项及原 timeout。交付区分功能与性能结果，耗时只表示本次验收，不作为受控性能对照。

## Risks / Trade-offs

- 领域矩阵与代表接线分别证明，仍有组合未逐一穿过整链。前序已确认的人工目录审查、routine/release-only/explicit-only 分工继续有效；完整取舍见 `c73ec649` 的本文件。
- 去重后，隔离材料证明真实 resolver/hash 的字节敏感性，compiler/API 测试另证真实工具链资格；删除的全树复制与默认工具链组合场景不再单独证明。
- 字节漂移的直接 checker 证明比较规则，真实 Definition 场景证明 Definition 到生成结果的漂移；`materialRoot` 转发由实际调用链审查确认。私有材料测试与 installed acceptance 分别验收。
- 性能预算与冷集成仍未闭合；本次质量加固不宣称带来性能收益，也不替代它们的验收。

## Open Questions

后续需确定 Gate 性能和冷 candidate 集成超时的修复范围；数值、失败现场及未验证边界见 [tasks](tasks.md#当前验证与未完成项)。当前授权覆盖本批文档与代码的审查、必要优化、Git 提交及既有 hook 推送；Change 删除和扩大修复范围仍须另行确认。

## Implementation Observations

真实 timer/I/O 资格测试保留 8 MiB 逻辑输入，为实际 `setImmediate` 提供最多 256 次 chunk 让步窗口，并断言早期取消后读取停止。该规模服务真实调度观察，容量上限、累计与取消协议另用小规模输入证明。进一步缩小会减少真实回调获得调度的机会；应先取得等价观察证据，再调整此规模。
