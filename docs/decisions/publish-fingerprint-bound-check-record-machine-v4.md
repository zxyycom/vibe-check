---
title: 将 machine v4 发布为指纹绑定的双文件集合
status: active
alignment: aligned
createdAt: 2026-08-21T15:02:46Z
purpose: 让 current machine publication 用 v4 Check final data 与 minimal Record rows 表达同一可信的双文件事实集合。
background: v3 Check/Record/evidence shape 已过时，但双文件 complete-set fingerprint 仍是必要 trust boundary。
decision: 保留双文件与 records fingerprint，硬切 v4 Check/Record shape 和 validators，并拒绝 v3 与全部兼容路径。
tags:
  - product-contract
relations:
  - type: 修订
    target: publish-fingerprint-bound-check-record-machine-v3.md
---

## 目的

- 让 machine consumer 读取 canonical four-state Check outcomes、Check final data 与 supplemental minimal Records，而不拼接 Definition、run lifecycle、policy 或 presentation facts。
- 保留固定 `run.json` 与 `records.ndjson` 的 complete-set fingerprint binding，使 partial 或 mixed files fail closed。
- 让 v4 schema identity 如实标识 breaking contract，并保持 current runtime 只有一个 writer、validator 与 reader path。

## 背景

- Core 只产生 canonical Checks 与 Records，且通过/失败 Check 的 primary data 与 Record data 都是安全冻结的事实；v3 shape 仍编码 `completed + verdict`、Record catalog 及 decision/reference evidence。
- 两个固定 pathname 没有跨路径 filesystem transaction；单独校验 row relation 不能防止不同 generation 的 files 被当作同一可信集合。
- v4 的 structural `{ checkId, id }` Record identity 与 canonical ordered Record rows 能在不增加 pointer、lock 或 generation protocol 的前提下支撑 complete-set verification。

## 决策

- 采用：machine v4 保持一个 canonical two-file set。`run.json` 发布 v4 identity、invocation、records fingerprint 与 canonical Checks；Check outcome 使用四态 grammar，passed/failed 带 final data，not-applicable/unavailable 使用受控 reason。
- 采用：`records.ndjson` 只发布 canonical ordered `{ checkId, id, data }` Record rows。validators 重算 canonical JSON、order、composite identity、ownership 与 complete Record-set fingerprint；空集合也有确定 fingerprint。
- 采用：Output 只投影 validated Core snapshot，不重算 Check status，不解释 Check-local data，也不从 Record 内容推断 presentation、aggregate、owner、count 或 ID。
- 采用：writer 在替换 canonical paths 前完成 candidate validation、serialization、complete-set validation 与同目录 temp writes；consumer 必须完整验证两个文件，mixed/partial set 绝不可信。
- 采用：v4 是单版本 hard cut：删除并拒绝 v3 identity、writer、reader、validator、example、adapter 与 fallback。当前 machine 不发布 catalog、decision、reference、acceptance、view、blocking evidence、effect status、timing 或 human-readable report。
- 不采用：dual writer/reader、permissive v3 converter、filesystem-atomic-snapshot 声称、generation pointer、reader lock，或从 arbitrary final/Record data 生成 fallback presentation。
