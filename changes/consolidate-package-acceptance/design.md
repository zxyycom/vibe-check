# Design

按验收的真实边界减少重复工作；实现与独立审查已完成，本轮补齐收尾验收和证据。

## Context

实施起点为 main 的当时未提交工作树，前序审计见 `.log/check-value-audit-20261023/RESULTS.md`。2026-10-23 的前后完整 Gate 均为 43 项功能通过但 mean/P95 失败，详见[验证与测量](verification.md)。相关实现已纳入首版提交 `f998ed4c`，且该提交包含在当前 main 中。

2026-10-26 按现行 Gate selection 完成收尾：routine all 达到原版本化预算，另以显式 types/workbench 诊断补齐已移出日常 all 的两项。两次 machine evidence 的通过集合覆盖当前全部 43 项，且 candidate fingerprint 与 tarball 摘要一致；不把这一结果描述为旧 workload 的稳定提速。

## Goals / Non-Goals

目标是减少包/API 重复计算并隔离故障注入，保持产品 API、内置 Check 自用、完整验收与性能门限。Lizard 后端和调度/依赖不在范围内；Gate selection 以[当前选择规则](../../docs/tooling/project-gate.md#selection-presets-and-scheduling)为准。本轮只补验收与证据，不修改实现、选择、预算或其它 Change；完成态版本保存与目录退出按当前授权办理。

## Decisions

### Intended Change

真实候选只接受完整正向 audit，Worker 反例使用独立合法最小材料。source 与 emitted runtime 的重复大图退出，runtime exact exports 在既有真实 Node child 对比独立清单；declaration 精确 inventory 保留。文档预期按同次 invocation 复用，载体逐项比较不省略。

### Resulting Impacts

公共表面保留多余导出的拒绝，source/emit/installed JSDoc 各自独立义务保留。跨进程材料必须保持 exact candidate 身份、拒绝缺损与漂移，不把完整文档正文附加到通用 machine facts。Case 仅随真实证明改变，文档使用当前 owner 的正向规则表述。

文档预期在候选准备的 typed 内存中保留，由 bound Run 写入 invocation-local 文件，并以路径、内容摘要及候选身份交给 artifact/docs 子进程。读取端拒绝缺损、篡改与候选不符；独立入口仍自行计算。该输入不进入 provider machine Data，也不跨次复用。

## Risks / Trade-offs

同名检查不等于同一事实；不能删除不同坐标或阶段的物理验收。共享工作区和资源压力使单轮差值不是稳定收益。负向 fixture 必须经过生产入口，不增加测试专用旁路。正式 Gate 若超预算仍如实失败，不重试取绿。

## Open Questions

无未完成的验收项。历史失败保留形成时结果，当前收尾证据见[验证与测量](verification.md#收尾验收2026-10-26)；版本保存与 finalize 是验收后的结项动作。
