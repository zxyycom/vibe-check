---
title: 采用完整测试实体与语义 Case 闭合
status: archived
alignment: aligned
createdAt: 2026-07-30T03:24:22Z
purpose: 让完整当前测试事实与长期证明目的分别可靠维护，并持续证明两者没有遗漏或悬空。
background: 一原生节点一 Case 会把机械身份复制成大量模板账本，却仍不能证明测试正文与行为契约语义一致。
decision: 临时发现完整当前实体并与人工维护的语义 Case 双向闭合，允许 many-to-many 映射且不提交派生实体清单。
tags:
  - testing
relations:
  - type: 修订
    target: use-native-test-evidence-catalog.md
---

## 目的
- 让受支持测试面的当前实体事实可以从源码与 runner report 完整恢复，不依赖人工清单。
- 让长期 Case 只保存真实证明目的、行为 owner 和当前执行证据，不按测试函数数量机械拆分。
- 让结构闭合与语义审查各自承担可证明的责任，避免用结构通过替代测试质量判断。

## 背景
- 一原生测试节点一条 Case 将 path、suite 和 test name 重复写入大量文件，Case 往往只复述
  测试名称，增加同步成本但没有增加证明信息。
- 静态测试声明与 Bun JUnit report 可以共同形成完整当前实体集合，并暴露 unsupported、
  static-only、runtime-only 和重复 identity。
- 一个稳定行为目的可能由多个输入、层级或入口共同证明，一个测试实体也可能同时支持多个
  可独立审查的目的；强制一对一会混淆 runner 粒度与语义粒度。

## 决策
- 采用: 版本化 runner profile 定义受支持测试面；每次严格检查从完整当前树执行 static
  discovery 与 Bun JUnit runtime report，并要求两者规范化后的实体集合相等。实体只作为
  临时事实，不提交 inventory、索引或源码 marker。
- 采用: `docs/testing/cases/` 以受控 Topic 和语义 Case 保存稳定 ID、当前行为 Owner、
  一个或多个 Entities 以及可证伪的 Proves。Case 按共同 owner 契约与可观察结果划分，
  Case 与实体允许 many-to-many 映射。
- 采用: 严格检查要求每个当前实体至少进入一个 Case、每个 Case 至少引用一个当前实体且
  不引用未知实体，并校验 Topic、Owner、结构和重复；不得用自动生成或无信息模板 Case
  消除缺口。
- 采用: 结构闭合不声称证明测试正文语义。测试正文、rename、split、merge 或 delete
  变化时，必须由 agent 重读行为 owner、断言和相关 Case，审查证明信号、可靠性与语义
  连续性。
- 不采用: 一原生 runner 节点一个 Case、committed 派生索引、兼容双读或第二套 parser。
