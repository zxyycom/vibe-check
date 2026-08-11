> **核心句：**本设计只固定文件政策的 owner、解析责任和不可跨越边界；精确 TypeScript API、数据树与实现算法留到功能排期后的阻塞审计。

## Context

Check/Record Core、共享任务编排和 TypeScript Project Definition 正在分别建立产品对象、执行边界与动态组合入口。本 change 位于这些基础之上，解决 Project Definition 如何为不同文件表达 Check 自有政策，而不是重新设计 Check 或其执行方式。

依据活动决策，尚未排期的 future feature 只维护产品意图、稳定边界和依赖。当前 artifact 因此不能直接用于实现。

## Goals / Non-Goals

**Goals:**

- 保持文件政策为可验证、可冻结的声明式纯数据。
- 明确公共 resolver 与 producing Check 的责任分界。
- 保持路径匹配、全局 scope、current/reference 一致性和来源解释等稳定结果。

**Non-Goals:**

- 规定精确 helper 名称、字段树、通用 merge 算法、cache identity、CLI surface 或完整测试矩阵。
- 为尚未实施的 Markdown、JSON、链接、安全或其它 Check 设计政策字段。
- 允许文件政策注册 Check、改变任务计划或扩大项目全局 inventory。

## Decisions

### Decision 1: Project Definition 只贡献声明式文件政策数据

Project Definition 可以组合文件匹配声明和 Check 政策输入，但进入 resolution boundary 的政策必须是可验证并可冻结的纯数据。Runner binding、任意函数和 operational execution settings 不属于文件政策。

这保留 TypeScript authoring 的组合能力，同时避免每个文件的政策解析依赖可执行闭包。精确 authoring API 等基础 Project Definition contract 落地后再确定。

### Decision 2: Producing Check 拥有自己的政策契约

内置或自定义 Check 的 definition/execution contribution owner 声明自己接受哪些 policy input、哪些输入允许文件级覆盖，以及如何验证并解析有序输入。公共 resolver 不解释 Check 专属字段，也不提供任意 deep merge。

这让动态 Check 可以参与文件政策，而无需由公共层预先枚举全部 Check；同时，未被 resolved Check owner 接受的数据必须在 Check work 开始前失败。精确贡献形态和应用算法延后到实现前审计。

### Decision 3: 公共 resolver 只拥有共同路径语义

公共 resolver 使用 normalized project-relative path 按声明顺序收集匹配项，将它们路由到所属 Check，并在执行前冻结最终 resolved policy 与 provenance。文件政策在全局 inventory 建立后生效，只能保持或缩小 Check 的输入资格，不能重新纳入 inventory 外路径。

同一 invocation 中，current 与显式 reference 对同一个 normalized path 使用同一声明快照和 resolved value，避免临时 checkout 位置改变政策。

### Decision 4: 可解释性是结果，入口形式延后

产品必须能说明目标路径匹配了哪些有序声明、这些声明属于哪个 Check，以及最终解析值来自哪里。该义务不要求现在固定专用命令、序列化 shape 或完整展示内容。

### Decision 5: 基础 change 先提供 seam，实施随后收敛

本 change 的 artifact 可以在基础设计阶段验证 Project Definition 与 resolved Check contribution 是否留下 authoring/validation seam，但不得反向规定三个基础 change 的公共契约。实际实现必须等 `establish-check-record-core`、`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 已实施或同步，并先完成 `tasks.md` 1.1 的重新基线与细化。

未来 feature change 只声明并消费自身政策输入，不另建匹配、顺序或冻结机制。

## Risks / Trade-offs

- **[基础契约继续演进，使当前术语或 seam 失效]** → 实施前重新读取实际主规范、代码和已落地 change，并重写本 change 到可实施状态。
- **[自定义 Check 的政策数据绕过 owner validation]** → resolution 只接受 resolved Check owner 明确声明并验证的贡献。
- **[重叠匹配难以理解]** → 保留声明顺序和来源 provenance，并由同一 resolution 路径支持解释。
- **[文件政策被误用为第二套 scope]** → 全局 inventory 先形成，文件政策只能保持或缩小各 Check 的输入。

## Open Questions

无待当前阶段回答的问题。精确 authoring、validation 和 resolution 形态属于实施前细化项，不是本 artifact 已确认的契约。
