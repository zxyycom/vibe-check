# Proposal

本 Draft 规划一个小型文档补充：指导用户通过预定义条件与普通 helper 复用现有 flag DSL。

## Why

项目已支持命名条件、共享声明对象和 helper。当前用户指南主要展示内联条件，缺少集中定义语义并跨 Check 复用的指导。
在现有章节补齐这条使用路径即可改善可发现性，沿用现有 API 与运行行为。

## Outcome

用户仅凭随包 Check authoring 指南，就能选择预定义常量或参数化 helper，在多个 Check 中复用条件，
并区分源码条件名称与 `project.flags` 中的 token。

该文档改进独立于[派生 flag 评估](../evaluate-declarative-derived-flags/proposal.md)，可按自身范围进入 Plan。
