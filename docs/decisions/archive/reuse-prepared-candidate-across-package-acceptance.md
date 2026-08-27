---
title: 在 package acceptance 间复用已准备 candidate
status: archived
alignment: aligned
createdAt: 2026-08-27T00:41:37Z
purpose: 让 artifact 与 external consumer 分别消费同一次 prepared candidate，同时保留各自的物理验收责任。
background: Gate 已拥有 exact artifact、staging 与安装结果；重复 build 或在 reuse path 重扫 build-only staging 会增加成本但不增加独立证据。
decision: 扩展 typed provider data，由下游按需消费，并把 staging 内容验收留给 artifact acceptance。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: provide-prepared-package-candidate-as-typed-check-data.md
---

## 目的

- 让同一次 Gate 已准备并核对的 candidate 成为 artifact acceptance 与 external consumer acceptance 的共同显式输入，而不是让每个测试重新恢复或构建相同 package 状态。
- 让 candidate preparation 的运算判断、实际 build/install 动作和下游 material acceptance 各有清楚 owner，避免用重复物理工作代替独立证明。
- 保持 corruption、路径混用和安装漂移 fail closed，同时让 required preparation 只复核其后续实际消费的事实。

## 背景

- Gate adapter 在加载安装后的 public package entry 前已经取得 exact artifact、digest、staging、installed entry 与 input fingerprint。
- External consumer 只需要 exact packed artifact；artifact acceptance 需要同一 artifact 与 staging material，并负责 public declarations、runtime layout、文档和生产依赖 inventory。
- Packed tar audit 已覆盖复用 artifact 的 runtime、source map、source 与 package material；installed consumer inspection 已覆盖 Gate 实际加载的 entry、文档和依赖。再次扫描 staging 内容不会改变 reuse action，却会重复 build-only acceptance。
- Receipt malformed、input mismatch、artifact invalid 和 installation drift 是可独立分类的运算结果；其中只有需要 build/install 的分支应执行物理 mutation。

## 决策

- 采用: Prepared candidate provider 使用版本化 closed data，保留 artifact path/digest、staging、安装与 entry identity，并保留 `preparationAction` 和 `preparationReason`；parser、digest、绝对路径和 containment validation 在依赖消费前 fail closed。
- 采用: Artifact acceptance 声明 provider direct dependency，消费 exact artifact 与 staging，并重新执行 staging material audit 后完成自己的 declarations、runtime、docs 与 dependency assertions；没有 Gate input 的直接目标测试才 fresh build 本地 fixture。
- 采用: External consumer acceptance 声明同一 provider direct dependency，但只接收其真实需要的 artifact path/digest，并继续在 ancestry-external consumer 中真实安装、typecheck 和运行。
- 采用: Candidate reuse assessment 是 mutation-free 运算边界，显式返回 reuse、reinstall 或 rebuild 及原因。Reuse path 验证 receipt/input、packed artifact 和 installed consumer，并要求当前 candidate state 的 staging directory 仍存在；staging 内容由 artifact acceptance 验收，不在每次 preparation 中重复扫描。
- 采用: Cold build/install/reuse 与必要 reinstall 继续由 candidate lifecycle 物理 acceptance 证明；malformed/stale receipt 的分类可以直接验证 assessment，无独立价值的第二次 physical rebuild 不保留。
- 采用: Provider data 只在一次 invocation 内有效；不发布为跨运行缓存或 machine contract。Mutable 故障注入 fixture、receipt 改写和临时安装继续由各测试 owner 本地拥有。
- 不采用: 下游隐式读取 ambient receipt、让 artifact acceptance 重复 build、把 staging 内容完全移出 acceptance、跳过 packed/installed corruption audit，或把所有 fixture 都提升为 typed Check data。
