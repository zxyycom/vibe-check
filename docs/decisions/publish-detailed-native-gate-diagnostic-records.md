---
title: 让 Native Gate 失败发布 owner-scoped 详细诊断 Record
status: active
alignment: aligned
createdAt: 2026-09-04T10:18:25Z
purpose: 让 Project Gate 的 native validation failure 为每条安全诊断保留可读取 Record，并在默认终端显示有界预览。
background: aggregate native failure 丢失 docs、Decision Records、Test Evidence 的可修复事实；ast-grep mismatch 无 Record。
decision: Native adapter 只转交逐项 Record 与有界预览；每个诊断 owner 继续拥有安全字段、局部 ID、排序和展示文本，外部命令原始输出仍只留私有 transcript。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 界定 native diagnostic publication 的长期责任边界；只有实现与验证均已成为事实后，才能据此复核 alignment。实现、Change Plan 或 checkbox 均不代替该证据。
- 让 `bun run check` 中 native docs、Decision Records、Test Evidence 与 ast-grep version validation 的 failed Check，向 `RunResult` 和 machine `records.ndjson` 逐项发布可归属的安全事实。
- 让默认 progress terminal 提供有限、可定位的预览；超过展示边界时明确省略数量，并指向完整 Records。
- 保持 Check-local Record identity/data、Check four-state outcome、aggregate、machine publication 和 owner-aware diagnostic channel 的既有责任边界。

## 背景

- 在此方向确定前，native operation 将 failure 压缩为一个 `{ code, count }` aggregate，丢失定位和具体 diagnostics。docs links 将坏链接拼入格式化 Error；Decision Records 只给出 validation error strings；Test Evidence 虽有 structured diagnostics，但 Gate 只保留 count/first code。
- ast-grep version mismatch 有 failed final data 和 message，却没有 supplemental Record；普通 command nonzero 则已有安全 `command-failure` Record 和 invocation-local process transcript。
- path、location、message、安全性和排序没有跨领域的共同语义。generic Gate layer 若猜测、解析或展开 Record data 或 child stdout/stderr，会越过 producing owner 的安全边界。

## 决策

- 采用：private `native-operation` adapter 接收 failure owner 已排序的安全 diagnostics。每项包含 stable Check-local `id`、non-array object `data` 和单行 presentation。adapter 为每项调用 `records.report`，并且不从 `data` 重建文本、字段、ID 或排序。
- 采用：详细 Records 是完整事实。adapter 只预览前十项；每项最多 240 个 Unicode code points，超长项标记 `truncated`；余项用准确 `omitted count` 指向同一 Check 的完整 Records。terminal preview 不截断 Record data。没有完整、安全且非空的 diagnostic collection 时结算 unavailable，不创建 synthetic aggregate failed Record。
- 采用：docs、Decision Records、Test Evidence 与 ast-grep owner 分别构造、审计自己的 safe diagnostic projection。docs `links` 为每个坏链接返回 typed diagnostic；其 Record 至少有 repo-relative source/target、line/column location 与 occurrence。docs workflow 对 expected validation failure 返回 typed diagnostics，而非只 throw formatted aggregate string。
- 采用：Test Evidence 只投影 owner 批准的 structural/Case diagnostics。来自 process result、parser exception 或其它未经批准文本的 raw stdout/stderr 不进入 Record 或 terminal preview。ast-grep version mismatch 只发布安全的 expected version、fixed mismatch classification、version exit code 和 log reference，绝不解析或复制 version stdout/stderr。
- 采用：ordinary external-command Check 继续使用 `command-failure`/`process-timeout` Record 与 private `checks/<check-id>/process.log`，不接入 native diagnostic adapter。package repository-quality Check 继续按既有 policy 为每条 Finding 发布 Record 并提供有界 presentation。
- 不采用：单个 count aggregate、Gate 通用 Record schema/field registry、从 arbitrary Record data 自动格式化、把完整 diagnostics 塞进一个 terminal message、以 raw child output 填充 Record，或为 native operations 新建 process transcript。
