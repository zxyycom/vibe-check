---
title: "mnemonist 0.40.6 升级价值"
id: "261021-assess-mnemonist-upgrade"
formedAt: "2026-10-21T03:30:55Z"
question: "mnemonist 新补丁的 LRU 修复是否值得仅消费 Heap 的本项目升级？"
tags:
  - "dependency-upgrades"
  - "mnemonist"
  - "scheduler"
relations: []
---

## 形成时背景

调查时，根、lockfile、安装与[发布 manifest](../../scripts/package/artifact/release-manifest.json)固定 `0.40.4`。[static-selection-query.ts](../../src/project-run/task-scheduler/admission-core/static-selection-query.ts)以 `Heap` 做 query-local best-first traversal，保存 immutable queue node 引用；当前检索未发现 LRUCache/LRUMap 消费。

## 调查目的

判断新增修复与实际 Heap 用途的交集，而非把其他数据结构修复变成 scheduler 收益。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/mnemonist/latest)与官方 [0.40.6 release](https://github.com/yomguithereal/mnemonist/releases/tag/0.40.6)。最新稳定候选 `0.40.6`；读取近邻静态选择实现与发布依赖归属。

## 调查结果与边界

**建议：暂缓单独升级；可在已有依赖维护窗口顺带验证。**

官方确证修复 LRUCacheWithDelete/LRUMapWithDelete deletion，以及 LRU variants 的 `setpop` 遇到 falsey key 不返回 eviction information。未给出当前 Heap path 的独立修复或性能收益，因此“补丁更多”不是优先级理由；也不能拿 LRU cache 修复描述本项目 raw cache 的改善。

若选择升级，维护根 pin/lockfile/发布 manifest，运行 static-selection-query、scheduler admission trace 与真实 candidate；保持 comparator tie order、empty heap、不可变 successor 和选中候选顺序。未执行 0.40.6，不证明 Heap 无变化或调度性能提升。
