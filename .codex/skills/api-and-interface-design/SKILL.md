---
name: api-and-interface-design
description: >-
  设计或审查可观察 public contract：REST/GraphQL endpoint、CLI/API surface、
  module/service boundary、component props、schema/example、machine-readable output、
  readable output、identifier、pagination/continuation 和 error mapping。
---

# API 与接口设计

## 目标

把接口设计成稳定、可验证、难误用、可兼容演进的 public contract。只要调用方、用户、脚本、测试、下游系统或文档读者能观察到某个行为，就先把它当作 contract 处理，除非 owner 文档明确标为 private。

本技能不替代具体产品规范。项目专属 ownership、文档入口、验证命令和兼容策略从当前仓库规则、owner docs、schema、examples、tests 或相邻实现进入。

## 读取策略

默认只读本文件。按当前 surface 加载一层 reference：

1. CLI/local tool、machine-readable protocol、readable output、schema/example、identifier、pagination 或 error mapping：读 [local-tool-contracts.md](references/local-tool-contracts.md)。
2. REST、GraphQL、TypeScript interface、frontend/backend boundary 或 component props：读 [web-interface-patterns.md](references/web-interface-patterns.md)。
3. `references/original-skill.md` 仅作为迁移前来源记录；运行任务时不默认加载。

## 流程

1. **识别 surface。**
   - 判断变更影响 endpoint、command、flag、config、module/service boundary、component props、machine output、readable output、schema/example、identifier/ref、pagination/continuation 还是 error mapping。
   - 明确字段、参数、默认值、error、ordering、label、example 和 validation artifact 中哪些会成为可观察行为。

2. **命名 owner。**
   - 命名负责该行为的层：route/controller、service、domain model、CLI wrapper、adapter、schema/example、UI component、SDK 或 consumer-facing wrapper。
   - 调用方优先映射或传递 owner 暴露的 contract；不要在外层重新发明 owner 的解析、路由、identifier 或状态语义。

3. **先定义 contract。**
   - 写清 input、output、error、pagination、ordering、nullability、default、compatibility、security boundary 和 validation source。
   - 没有 contract 就先补 contract 形状，再实现；不要让当前实现反向定义长期接口。

4. **设计兼容路径。**
   - 优先新增 optional field、enum value、output section、endpoint capability 或 feature flag，再考虑修改现有 contract。
   - 除非有意 breaking change，否则保持字段含义、类型、nullability、ordering、default、identifier opacity、error code 和 readable label 稳定。
   - Breaking change 不可避免时，先写清 migration behavior、affected consumers、rollback/downgrade story 和 validation update。

5. **保持 boundary 清楚。**
   - Machine-readable output 和 readable output 可以共享业务语义，但各自保留 wrapper、schema、pagination envelope 和稳定性承诺。
   - Identifier/ref/token 由 owning layer 生成和解析；其它层只做存在性、类型和边界检查，并原样传递。
   - 外部输入、第三方响应、tool output、browser output、log 和 generated content 都按 untrusted data 处理，在系统边界验证。

6. **保证 deterministic。**
   - 对 entries、matches、errors、schema/example fields 和 readable labels 保持稳定排序。
   - 同一 input、option 和 page request 的 pagination/continuation 必须可复现。
   - 避免暴露 parser internals、host-specific path、不稳定 hash、timestamp 或依赖 timing 的文本。

7. **同步 validation material。**
   - Schema、example、fixture、golden output、docs 和 tests 是 interface change 的一部分，不是后续 cleanup。
   - Test 应断言 public surface 和 cross-layer mapping，而不只覆盖 helper internals。

## 边界

- Readable output 也是 contract；label、ordering、truncation hint、empty state 和 continuation instruction 都要有意设计。
- Machine output 与 readable output 可以语义一致，但不能混用 wrapper、schema 或 validation promise。
- Observable interface change 必须同步更新用于校验或展示该行为的 schema、example、fixture、docs 和 tests。
- Compatibility、pagination、error mapping、identifier opacity 和 validation ownership 属于设计输入，不是实现后的修补项。

## 完成检查

批准 interface code 或 contract artifact 前确认：

- 已命名 affected surface 和 owning layer。
- Contract 写清 input、output、error、pagination/continuation、ordering、compatibility 和 validation source。
- 除非变更有意 breaking，现有 consumer 仍能使用当前字段、identifier、flag、default、error 和 readable output 文案。
- Machine/readable outputs 保留各自 wrapper，同时保持业务语义一致。
- Identifier/ref/token 在 owning layer 外仍是 opaque pass-through value。
- 当 observable behavior 变化时，schema、example、fixture、docs 和 tests 已同步更新。
- 验证命令覆盖 public contract 和 cross-layer mapping；命令来自当前仓库脚本、规范或相邻测试。
