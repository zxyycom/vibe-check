---
title: 使用通用 machine v2 承载内容检查
status: archived
alignment: null
createdAt: 2026-08-04T15:02:12Z
purpose: 让数值指标、内容问题和安全问题通过一套可验证且可演进的机器契约发布。
background: Current machine v1 固定为数值 warning 和三项 capability，无法无损表达非数值 finding、观察值和动态能力成员。
decision: 采用 single-active generic machine v2，并用语义注册表指纹标识 producing revision 的能力目录。
tags:
  - product-contract
relations: []
---

## 目的
- 让 machine consumer 不解析人读 message，就能区分数值阈值、内容错误、安全问题和 current-only observation。
- 让新增格式能力时保持 schema 版本、producer registry 和实际 finding 语义之间可验证的关系。

## 背景
- Machine v1 的固定 capability fields 和 numeric warning shape 无法表达 JSON syntax、broken link、schema reference 或 secret finding，而不伪造数值或把必需语义塞入 message。
- 为每个 feature 追加顶层 machine shape 或直接修改同一 schema URN 的 bytes，会使公共契约和已保存 artifact 的含义漂移。
- 保留 v1/v2 dual writer 会增加 mapper、validator、publication 和下游集合不变量的双重 owner。

## 决策
- 采用: Machine output 以 single-active v2 hard cut 提供 closed metric/content/security finding variants、generic observations 和 registry-owned capability results；不维护 dual writer 或宽松旧 reader。
- 采用: 每个 machine schema version 的 immutable URN 和 schema bytes 固定 generic shape；schema 不枚举随产品 revision 增长的 capability、check 和 metric IDs。
- 采用: Producing revision 对 sorted public semantic catalogs 计算确定性 registry fingerprint并写入 machine document；Product validator同时校验该 revision 的 ID、finding variant和typed evidence catalog。
- 采用: 新 feature 注册语义目录时更新 expected fingerprint、examples 和 validator fixtures，但不因此改写 machine v2 schema bytes。
- 不采用: 为非数值问题伪造 numeric warning，或把 message/suggestion 当作恢复必需机器语义的字段。
