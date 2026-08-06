---
title: 采用完整上游 Skill 包并允许显式项目本地例外
status: archived
alignment: null
createdAt: 2026-07-30T03:24:22Z
purpose: 保持 Skill 来源和升级边界可审计，同时允许项目特有能力由本仓库完整拥有。
background: 完整替换上游包适合通用方法，但携带固定账本 runtime 的版本不能表达本项目的语义 Case 与全树闭合边界。
decision: 通用 Skill 默认按完整上游包维护；只有项目 owner 与验证入口已明确时，才登记并维护最小项目本地例外。
relations:
  - type: 修订
    target: workflow-policy/use-upstream-project-skill-packages.md
---

## 目的
- 让通用工程判断 Skill 可以持续从上游完整升级，不产生难以追踪的局部混合。
- 让必须读取项目能力、且实现契约由本仓库拥有的方法层 Skill 不被不兼容的上游 runtime
  覆盖。
- 让每个项目本地例外都有明确理由、owner、文件边界和升级审查要求。

## 背景
- OpenSpec、架构边界、共同分母、最小实现和调查报告等通用方法适合作为完整上游分发单元。
- 测试实体发现、runner profile、Case 存储和闭合语义是 Vibe Check 项目契约；把固定路径、
  parser、schema 和索引 runtime 随通用 Skill 安装会形成第二个 owner。
- `test-evidence-review` 需要先探测项目是否声明 Case、Topic 和完整性 wrapper，没有这些
  能力时仍应直接审查测试，而不能推定一套持久化机制。

## 决策
- 采用: `openspec-apply-change`、`openspec-archive-change`、`openspec-explore`、
  `openspec-propose`、`product-architecture-judgment`、`dependency-boundary-design`、
  `common-denominator-design`、`minimal-implementation` 与 `investigation-report` 继续按
  完整上游分发单元维护；项目接线只写在包外。
- 采用: 项目本地 Skill 例外必须由当前行为 owner 与项目验证入口支撑，只保留完成方法层
  职责所需的最小文件，不能复制项目 runtime、schema、索引或配置形成第二来源。
- 采用: `test-evidence-review` 是当前显式项目本地例外；它只提供能力感知的测试语义评审，
  Vibe Check 的 runner adapter、Case 契约、CLI 和闭合检查由项目文档与
  `scripts/test-evidence/` 拥有。
- 采用: 后续同步上游 Skill 时不得机械覆盖项目本地例外；应先比较能力边界，只有新版本
  同时满足项目 owner、最小文件边界和验证要求时才通过新的决策演进取消例外。
- 不采用: 对上游完整包作未记录的局部修改，或因一个例外改为所有 Skill 都由项目 fork。
