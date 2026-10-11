# Proposal

本 Plan 交付随包 change flag 调试工具，展示所选当前文件假如发生变更时会命中的 flags。

## Why

现有 `project.changes` evidence 只包含实际变更中命中 region 的路径。
调用方需要查看未变更和零命中文件，提前审视漏配、范围过宽或预期重叠。

## Outcome

调用方显式提供文件枚举范围与当前 change regions，取得可查询、按需呈现的结果：

- 列出所选全集的每个文件、flags 和命中数，包含零命中；支持按 flag 查看文件。
- 说明本次 root、patterns、默认排除生效值及实际列表，清楚界定报告范围。
- 每次调用重新获取文件，同次查询和展示共享一个 Core 关系视图。

实施基线须实际继承已验收的[Core 索引](../add-project-file-membership-queries/proposal.md)与
[文件收集](../../docs/guides/collecting-project-files.md)稳定提交，具体报告与验收归 [Design](design.md)。

## Scope

### Intended Change

- 提供同步程序化 Non-core 工具，显式输入 root、selection 与当前 change regions，复用公共 collection/Core。
- 返回逐文件 flags/命中数、按 flag 查询及完整范围元数据；formatter 按需呈现，不自动打印、写文件或分享。
- Readiness 固定最小报告与输入适配接口；仅映射收集到的当前全集，不增加独立试算 API、CLI/bin 或配置发现。

### Resulting Impacts

- 新增随包工具 owner、package root exports、声明/JSDoc、公开说明与受管示例，保持 Run machine output 和 effective flags 不变。
- 实施基线必须继承已验收 Core 与收集完整迁移的稳定提交；包材料和共同文档与上游串行。

## Success Criteria

- 零/单/多命中可见，逐文件与按 flag 结果、命中数一致，region 匹配与同一路径的 Runtime 匹配一致。
- 报告恢复 root、patterns、默认排除生效值及实际列表，区分未收集与零命中，说明 no-follow、快照和非实际 Git evidence 边界。
- 每次调用重新收集，同次查询/呈现共享关系且无 I/O；合法空全集与明确失败可区分。
- 安装后独立消费结果与按需 formatter，通过相邻测试、公开材料和包验收；上游依赖有被实施基线继承的验收提交。

## Affected Owners

- [API 机制](../../docs/api-mechanics.md#按文件变化选择-check)、[随包工具](../../docs/development/package-tools.md)与上游 collection/Core 公开契约。
- [文档材料](../../docs/tooling/documentation.md)、[包产物](../../docs/tooling/package-artifact.md)、[测试策略](../../docs/testing/strategy.md)与 README 工具入口。
