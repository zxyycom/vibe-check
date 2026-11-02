# Design

以一个实际候选包建立完整审查范围，独立分区阅读，再将修正与结论绑定最终候选包。

## Context

- 当前工作区为 main，HEAD 为 `7c9c69e609a5d095e2c459923b321cb4925f0713`；已有 README、changelog、building-project-gate、command-check、run-outputs 五篇未提交修订属于本轮工作。
- 用户最初授权 0.0.5 文档收口及全部随包文档/公开 JSDoc 审查，要求先不提交或发布；审查完成后追加“先提交结项”，授权保存完成态与正常 finalize，发布仍未授权。
- 遵循活动判断 `261019-require-consumer-oriented-package-documentation-review`、`260905-review-documentation-impact-by-audience`、`260905-structure-package-documentation-by-user-task`、`260830-use-chinese-as-primary-language-for-package-consumer-documentation` 和 `260909-ship-changelog-with-package`。

## Goals / Non-Goals

目标是发布准备期的完整文档审查、必要修正及获授权后的提交结项。本 Change 仅承接文档准备；不执行正式 release prepare/verify，不创建发布分支、worktree、tag 或发布 npm。普通提交遵循当前 checkout 已启用的限域 auto-push，后续正式 release Change 仍按发布 owner 交接。

## Decisions

### Intended Change

- changelog 使用已确认的 `0.0.5` 章节，说明相对 v0.0.4 的净变化，不添加发布成功日期或 registry 状态断言。
- 使用 `package:build` 产生本地候选包，以实际 tarball/installed files、文档映射和 public inventory 交叉核对范围。
- 独立审查分为核心 Run/Check/输出、内置 Check/文件工具、调度与数据工具三组；均先读用户材料与声明，再核对实现，记录各自阅读清单，不将 grep 或类型通过当作语义阅读。
- 主代理负责修正，非实施审查者复核；仅在必要时修改 JSDoc 或示例，保持源码行为不变。
- 表达复审沿用三组阅读边界，区分使用障碍与风格偏好。当前指南以当前任务为主，changelog 保留版本迁移事实；不以删否定词或压缩行数代替语义判断。

### Resulting Impacts

- 文档/声明变化使 candidate fingerprint 失效；修正后重建并比较已审对象，受影响组重新确认。
- 公开声明按包根导出和本包类型引用的保守文件闭包划分；辅助内部声明不因物理随包而自动成为公共承诺，但读取覆盖会注明适用边界。
- 审查证据保存在本 Change 的 evidence 与 inventory；这些是短期交接材料，不另建长期报告或平行规范。

## Risks / Trade-offs

全包 JSDoc 阅读量较大，须对清单逐项闭合而非按 diff 代替。候选版本为 `0.0.0-local.*`，不能证明正式 0.0.5 已构建或发布；正式包形成后仍须核对材料/声明一致性并完成同 tarball 的完整验收。

## Open Questions

无阻止结项的问题。当前授权覆盖 main 上的限域提交、项目 hook 及保存完成态后的 finalize；不扩展到正式构建、发布分支/worktree、tag 或 npm 发布。完成态与审查证据先保存于 Git，再退出活动 Change 集合。
