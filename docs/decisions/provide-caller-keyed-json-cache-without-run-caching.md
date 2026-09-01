---
title: 提供 caller-keyed JSON cache 且不缓存 Run settlement
status: active
alignment: unaligned
createdAt: 2026-09-01T03:20:25Z
purpose: 让 custom Check 和项目代码复用 caller-owned key 的持久化 JSON 结果，同时保持失效语义与 Check settlement owner 不变。
background: duplicate detection 当前独占领域 cache；新的真实 consumer 只需要通用存储机制，并明确由项目生成完整 key。
decision: package root 提供 cacheJsonByKey；caller 拥有 key、parser 和计算语义，Run 不缓存 Check settlement。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: keep-duplicate-detection-cache-check-owned.md
---

## 目的

- 让 custom Check 和普通项目代码按自己生成的完整 key 复用持久化 JSON measurement/result。
- 让共享层只拥有 content-addressed 存储、payload validation 和原子写入，不猜测输入依赖或领域失效规则。
- 保持 Check execution、Records、messages、terminal outcome 和 cache failure policy 由实际 consumer 拥有。

## 背景

- duplicate detection 是现行唯一内置 cache consumer，并且只有该 Check 能解释 raw fragment identity、payload 和失败结算；这些领域责任仍不能进入 Project Run。
- custom Check 和项目代码存在第二种稳定需求：caller 已能产生包含输入、实现、配置和工具身份的 key，只缺少可复用的本地 JSON cache mechanics。
- 若 Run 按 key 跳过整个 Check，就必须持久化并重放 outcome、Records、messages、dependency data、duration 和 side effects，形成新的 settlement owner；这不是本能力要解决的问题。

## 决策

- 采用: package root 提供独立异步 `cacheJsonByKey(...)` helper。caller 显式提供 absolute cache directory、非空 `namespace`、非空 payload `version`、非空 opaque `key`、同步 `parse(unknown)` 和同步或异步 `compute()`。
- 采用: caller 对 key 完整性负责；它必须覆盖会改变 compute 结果的输入、实现版本、options、toolchain 和声明的外部状态。helper 不分析 AST、文件依赖、环境或函数 identity，也不把 caller key 宣称为可信 content hash。
- 采用: helper 以 cache API version、namespace、payload version 和 caller key 的规范结构生成 SHA-256 identity digest，并只用该 digest 形成文件名；cache envelope 不保存或记录 raw caller key。
- 采用: payload 仅接受 canonical JSON object。disk payload 视为不可信输入，cache hit 前必须通过 envelope identity 和 caller parser；miss、malformed JSON、identity mismatch 或 parser rejection 都重新 compute。computed value 必须经过同一 canonical snapshot 与 parser boundary 后才可返回和写入。
- 采用: 成功 hit 返回 frozen `{ source: "cache", value, read: "hit", write: "not-attempted" }`；成功 compute 返回 frozen `{ source: "computed", value, read, write }`，其中 `read` 是 `miss | invalid | failed`，`write` 是 `stored | failed`。cache read/write failure 是可观察的优化状态，不改变 computed value，也不自动创建 Check message、Record 或 terminal status。
- 采用: helper 在目标目录内写临时文件并以 atomic rename 发布；同 key 并发 miss 可以重复 compute，最终 payload 必须因 caller key 契约而语义等价。compute throw、cancel、noncanonical value 或 parser rejection 原样失败且不发布 cache entry。
- 采用: cache directory 是 caller 明确信任且可删除的本地状态空间；helper 不提供 containment、secret storage、tamper resistance 或不受信任共享 cache。caller 不得把 secret 或低熵敏感材料放入 key，SHA-256 文件名不是保密机制。
- 采用: duplicate detection 继续拥有自己的 cache options、identity、payload parser、失效和 unavailable mapping；本 Decision 不要求迁移其 store。Project Run、Definition、Check facts、scheduler 和 machine publication 不获得 cache manager 或 settlement replay capability。
- 不采用: 自动依赖发现、whole-Check cache、binary artifact cache、默认全局目录、TTL/LRU、自动清理、remote/distributed cache、跨进程 lock/single-flight、parser registry，或用 cache hit 替代当前 invocation 的 Check settlement。
