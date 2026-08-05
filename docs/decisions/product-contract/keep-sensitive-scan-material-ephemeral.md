---
title: 让敏感扫描材料保持临时且不可持久化
status: archived
alignment: null
createdAt: 2026-08-04T15:02:13Z
purpose: 防止秘密检测和外链验证把待检查的敏感内容扩散到质量产物或诊断系统。
background: Secret bytes、URL query values 和 userinfo 可能包含凭据，扫描流程自身不能成为新的泄露渠道。
decision: 原始敏感材料只存在于调用期受限内存，持久和公开边界只接收安全语义身份与脱敏证据。
relations: []
---

## 目的
- 让 Vibe Check 可以发现秘密并发送必要的外链请求，而不会把秘密原文、credential URL 或其可反推 digest 写入新的存储和输出位置。
- 让 finding、acceptance、comparison 和 cache 只依赖可安全公开且在值轮换后仍稳定的语义身份。

## 背景
- Secret detector 必须读取候选文本，network transport 也可能需要保留 query values；这些值经常正是最不应进入日志、artifact 或 fingerprint 的内容。
- 仅删除显示文本不足以防泄露；raw scanner output、error、cache key、digest、fixture、trace 和临时产物都可能形成新的持久副本。
- 以 secret value、substring、regex 或完整 URL 匹配 allowlist，会把敏感值继续传播到 project config 和评审历史。

## 决策
- 采用: Secret bytes、完整 request URL、query values 和 userinfo 只可存在于 invocation-owned bounded memory，并仅由实际 detector 或 request boundary在使用后释放。
- 采用: 原始敏感材料及其可值关联 digest 不得进入 console、stderr、report、machine DTO、finding/evidence、raw artifact、cache、log、trace、error 或持久 derived key。
- 采用: Finding 和 acceptance 使用 Product-owned stable rule/check ID、normalized project-relative path、line-independent semantic occurrence及脱敏 shape；secret allowlist不接受 value、substring、regex或message matcher。
- 采用: Required tests只使用明确标记且不可用于真实系统的合成秘密，并对正常与失败输出执行泄露缺失检查。
- 不采用: 依赖后处理日志清洗来补救上游已经传播的原始敏感值。
