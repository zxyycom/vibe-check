---
title: 采用一原生测试节点一条证据的统一目录
status: archived
alignment: null
createdAt: 2026-07-27T06:40:00Z
purpose: 让测试证明目标与实际 runner identity 一一对应，并通过统一索引持续校验。
background: 聚合账本和源码 marker 允许多个原生测试共享 case，难以证明目录没有遗漏或漂移。
decision: 使用固定 test-evidence 目录维护单节点 case，并删除项目自有 marker 和双读。
relations: []
---

## 目的
- 让每条测试证据能够精确定位一个最小原生 runner 节点及其 Contract 和 Proves。
- 让统一 CLI 机械发现目录内的重复、格式和派生索引漂移，并让测试变更流程显式审计
  runner 与 case 的一一映射。

## 背景
- 旧 `docs/testing/cases.md` 按行为链聚合 case，多个 test 节点可以共享一个编号；源码
  `@case` marker 只标记分组入口，不能独立表达每个 runner 节点。
- 账本和 marker 形成多个人工同步点，既有 docs validator 也不能证明 runner 与 case
  一一对应；测试 runner 本身才是可执行入口身份。
- 上游 `test-evidence-review` 已提供固定目录契约、受控 topic、单 case source、派生索引和
  CLI / ESM API，可以由项目薄 wrapper 固定仓库根。

## 决策
- 采用: `docs/test-evidence/test-evidence-topics.json` 定义稳定 topic，
  `docs/test-evidence/<topic-id>/<case>.md` 每个文件只映射一个原生 test 节点，
  `test-evidence-index.json` 只作为统一 CLI 生成的派生投影。
- 采用: Case Entry 精确记录 path、suite 和 test name；Contract 追溯当前行为 owner，
  Proves 记录该节点实际断言的可观察结果。
- 采用: 删除聚合 case ledger 与 Vibe Check-owned 源码 `@case` marker，不保留兼容读取、
  影子索引或第二套 parser；pinned toolkit submodule 内的上游历史注释不作为项目证据输入，
  历史 OpenSpec archive 只作为历史记录保留。
- 采用: `scripts/test-evidence.ts` 只固定仓库根并复用上游 ESM API；package scripts 提供
  list、show、sync-index 和 strict check，required workspace verifier 执行 strict check。
