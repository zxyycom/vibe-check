# Proposal

本 Change 将 package consumer 文档收敛为单一 README 入口、独立 Check 指南和一份深入 API 机制说明，并让编码型 AI 能只依据实际随包文本恢复正确的集成路径与结果边界。

## Why

当前 README 同时承担入门、内置 Check 细节和进阶机制，`docs/checks/index.md` 又增加一层导航。consumer 难以先恢复最常用的自定义 API 和运行效果，再按需深入。结构收敛后仍需校准术语、责任归属、执行顺序和示例效果，避免 AI 把 `defineConfig` 当作验证边界，或把 `RunResult.kind: "completed"` 当作所有 Check 均通过。

语义校准后还存在第二类偏移：入口与指南重复用缺失 surface、旧责任对比、内部模块名和“非目标”解释边界，导致“系统不是什么”占用超过完成 consumer 任务所需的重心。最终文本应先给出可执行目标状态，只在会改变调用、安全或结果判读时保留局部负向约束。

## Outcome

最终 package 只有 README 作为总入口；README 直接说明常用自定义 API、效果与内置 Check 概览，并直接链接七份 Check 指南和最多一份深入 API 机制说明。编码型 AI 从 README 出发即可生成有效的 root-import TypeScript、区分 Run 与 Check 结果，并只在需要 preflight、dependency、aggregation 或完整失败分支时下钻唯一机制文档。

## Scope

### Intended Change

- 重写 package README template，使其以自定义 Check、Definition、Run 和基本结果处理为主线。
- 移除 `docs/checks/index.md`，由 README 直接链接每项 Check 指南。
- 新增唯一的深入 API 机制文档，承接 preflight、typed dependency、Controls、outputs 与完整结果边界。
- 调整 package documentation registry、projection、fingerprint、artifact audit、tests 和稳定 owner，使最终 material 与新结构一致。
- 以 README、唯一 API mechanics 文档、目标 Check 指南和 installed declarations 作为实际 AI 消费闭包，校准术语、owner、生命周期、条件和结果判读。
- 收敛重复负向描述与内部迁移残留：README 保持自定义 API 主线，机制页只解释 invocation lifecycle，Check 指南以适用边界替代重复“非目标”清单。

### Resulting Impacts

- README 与深入机制文档中的示例必须继续来自 allowlisted TypeScript sources，并由 isolated consumer execution 验证。
- Check guide exact inventory 仍须覆盖全部 package-provided Checks，且不允许未登记的额外 Check 页面。
- package artifact、tarball 与 installed candidate 必须携带相同文档内容并保持内部链接闭合。
- 相关 Repository Tooling Cases 必须随测试正文和可观察证明目的同步更新。

## Success Criteria

- 最终 package 不含 `docs/index.md` 或 `docs/checks/index.md`。
- README 直接链接七份 Check 指南和唯一深入 API 机制文档，并以自定义 API 与运行效果为主要内容。
- README 明确 `defineCheck`、`defineConfig` 与 `run` 的不同责任，示例必须检查 `RunResult.kind` 和目标 Check outcome；API mechanics 必须准确表达 invocation validation、preflight barrier、settlement、aggregation 与 outputs 的先后关系。
- 从实际消费闭包可恢复：只从 package root 导入；`completed` 不等于全部 Check `passed`；Check `failed` 不等于 Run infrastructure failure；内置 Check 仍是普通 Check value。
- README 与指南先表达支持的操作、输入和结果，再表达必要例外；缺失 surface、内部 adapter / Core owner 和已退场结构不得成为正文主线。
- 所有投影示例在生成输出中逐字保持，并通过 ancestry-external installed candidate execution。
- docs validation、目标 tests、Test Evidence closure、Decision/Change checks 与 full package workspace verification 全部通过。

## Affected Owners

- `docs/coding-style.md#64-package-对外说明以中文叙述为主`
- `docs/script-tooling.md#documentation-validation-and-package-material`
- `docs/testing.md#测试所有权`
- `docs/testing/cases/repository-tooling.md`
- `scripts/docs/package-api/**`
- `scripts/package/**`
