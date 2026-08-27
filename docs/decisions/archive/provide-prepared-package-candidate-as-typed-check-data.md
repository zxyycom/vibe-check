---
title: 将已准备的 package candidate 表达为 typed Check data
status: archived
alignment: aligned
createdAt: 2026-08-26T23:41:45Z
purpose: 让可复用的 exact package candidate 成为可验证、可依赖并保留在 Check facts 中的正式结果。
background: Gate 在 Run 前必须准备并加载 candidate，但后续 consumer acceptance 仍从 receipt 状态重新恢复同一 artifact。
decision: 用 required typed provider Check 保留 prepared candidate，consumer Check 通过 direct dependency 消费。
tags:
  - configuration
  - testing
  - workflow-policy
relations: []
---

## 目的

- 让 Gate 已经取得的 exact prepared candidate 不再只是 adapter closure 中的临时对象，而成为同一次 Run 可观察的 typed final data。
- 让真正消费同一 immutable artifact 的下游 Check 通过显式 dependency 取得数据，不再依赖 ambient receipt、路径发现或重复 preparation。
- 保持临时、可变、只属于单个测试序列的 fixture 在其测试 owner 内，不把所有 setup 都提升为跨 Check contract。

## 背景

- Project Gate 为了从安装后的 public package entry 运行，必须在加载 bound Run 前完成 candidate build/install 与 exact entry identity 核对。
- Product 已支持 `defineCheck({ parseData, execution })` 的 typed provider；downstream 先声明 direct dependency，再通过 `dependencies.get` 和 provider parser 恢复 canonical final data。
- 当前 external consumer acceptance 再次调用 `preparePackageCandidate()`，虽然 receipt 通常允许复用，但该调用没有把它消费的是同一次 Gate candidate 表达为 Check dependency fact。
- Candidate lifecycle acceptance 内部会主动破坏 receipt、删除依赖并重建临时状态；这类 mutable fixture 没有跨 Check 的稳定生命周期或共同消费者。

## 决策

- 采用: Project Gate 建立 required typed provider Check，输出带 schema version 的 prepared candidate identity，包括 artifact path/digest、candidate version、input fingerprint、文件 inventory、安装路径、resolved entry 与 reuse fact。
- 采用: provider 在通过前重新核对绝对路径、artifact digest、installed entry containment 与存在性；`parseData` 对 canonical dependency data 执行 closed business-shape validation，Product 不替 provider 推断类型。
- 采用: external consumer acceptance Check 声明 provider 为 direct dependency，要求 upstream `passed`，调用 provider parser，并把 exact artifact path/digest 作为受控 child-process input；其测试不再在 Gate 路径重新运行 candidate preparation。
- 采用: provider 保持 required，因为 candidate preparation 和 exact imported entry 本来就是所有正式 Gate profiles 的前置边界；三个高成本 package acceptance Checks 仍由 `package-tests` tag 控制。
- 采用: 只有 immutable、canonical、具有独立生产责任且存在真实 downstream consumer 的 fixture 结果提升为 typed Check data。测试内部的 mutable temporary state、故障注入步骤与仅有单一消费者的 setup 保持 test-local lazy fixture。
- 不采用: 把绝对路径当作无验证的 ambient environment、让 consumer 读取 receipt 作为隐式 dependency、把所有测试 setup 都建成 Check、或用 supplemental Record 代替唯一主 candidate result。
