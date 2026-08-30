# Proposal

本 Change 处置首次公开发布前当前已知的 repository-quality Findings，并为每一项保留可复核的修复或例外依据。

## Why

最新成功 Project Gate 记录了 28 条 file-metrics、134 条 function-metrics 和 2 条 Markdown link Findings。它们在开发期保持非阻断，但既有决策要求公开发布前逐项处置；固定阈值不能因为问题长期存在或仅轻微超出而被默认忽略。

本 Change 收尾时的 full Gate observation 将上述 164 条 Findings 收敛为 1 条：只有字节保持不变的 historical v2 run schema 仍超过 file-metrics 阈值。所有活跃实现、脚本和测试热点均已实际整改；用户已批准并实施该历史制品的精确 Gate 私有扫描例外。该次最终 Gate 没有 repository-quality Findings；这是本 Change 的历史验证事实，不是对后续工作树的持续证明。

## Outcome

当前已知的 repository-quality Findings 均已通过实际整改或经过明确审核且有证据的特定例外完成处置，并由同一套正式 Gate 重新证明。

## Scope

### Intended Change

- 修复失效 Markdown 链接。
- 在不改变公共产品契约和既有运行语义的前提下，按 owner 整理超出文件、函数复杂度、函数代码密度和参数数量阈值的实现与测试。
- 对不能通过更清晰的局部实现合理消除的 Finding，保留原状并形成逐项证据与经用户确认的明确选择；不建立无证据的通用豁免。
- 以最新成功 Gate 的 Records 为基线，并在每批整改后重新生成真实 repository-quality 证据。

### Resulting Impacts

- 修改测试正文、拆分测试或抽取测试辅助能力时，必须保持既有 Case、Owner 与 Proves 关系并闭合 Test Evidence。
- 私有模块拆分必须保持公开 package surface、Check final data、Record、错误代码、调度结果和诊断输出不变。
- 文件扫描范围或阈值例外只有在证明材料类型或领域约束确实需要且经用户确认后才可实施；历史存在本身不是理由。
- 跨越 package Checks、Project Run、脚本、文档与 Gate 验证，需要按 owner 运行目标测试并最终运行 required workspace Gate。

## Success Criteria

- 两条已知 Markdown link Findings 已消除。
- 最新基线中的每条 file/function metric Finding 都有实际整改结果，或有单独、可审计且经用户确认的必要例外。
- 没有为了降低指标而引入只转发参数的 wrapper、无领域含义的 helper、预设共享层或行为变化。
- 修改后的目标测试、Test Evidence closure、类型与 lint 验证通过。
- `bun run verify:vibe-check-workspace:required` 通过，并且新的 repository-quality Records 能证明处置结果。

## Affected Owners

- `docs/coding-style.md` 与 `docs/quality-metrics.md` 的质量判断和指标说明。
- `scripts/project/gate/repository-quality-checks.ts` 的仓库私有质量选择与阈值。
- `src/package-checks/**` 的内置 Check 行为 owner。
- `src/project-run/**` 与 `src/check/**` 的 Project Run、调度、结算和诊断 owner。
- `scripts/**` 的项目工具 owner，以及 `changes/**` 和 `docs/**` 的文档 owner。
- `docs/testing.md`、`docs/testing/case-maintenance.md`、语义 Case 账本与相关原生测试。
