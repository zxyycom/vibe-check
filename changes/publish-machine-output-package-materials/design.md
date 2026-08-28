# Design

本设计把 machine v4 files 作为显式 package resources 交付，同时保持 README 单入口和 two-file trust boundary。

## Context

Machine v4 的 schema、examples 和独立 docs validator已经由 `docs/output.md` 与 output tests拥有。Package documentation 当前只处理有一个 trailing LF 的 Markdown；artifact examples包含合法零字节 `records.ndjson`，不能伪装成普通 Markdown document。Package artifact使用 allowlisted documents和 source fingerprint，宽泛 manifest glob不是接受依据。

## Goals / Non-Goals

目标是交付 current consumer contract materials，并由 exact candidate acceptance证明 installed bytes。非目标是发布 historical schemas、repository scripts、生成器或测试，新增 artifact reader，改变 v4 DTO，或新增第二 package index。

## Decisions

### Intended Change

Output guide进入 package supporting Markdown inventory；current schemas与四组 examples进入独立只读 resource registry。两类材料共同参与 package link resolution、source fingerprint、staging copy、tar audit、installed comparison与 external docs acceptance。Output guide把读取顺序、field/schema与 complete-set trust boundary放在前面，repository implementation和history降级到后续维护章节。

### Resulting Impacts

Documentation audit需要返回 documents和resources，但 Markdown trailing-LF规则不应用于合法零字节 NDJSON。Staging allowlist与packed/installed audits必须按 package path逐字节比较 resources。README仍是唯一总入口并直接链接 output guide；schemas/examples不建立额外导航页。Current material改变使旧 candidate receipt失效。

## Risks / Trade-offs

- Examples增加 package bytes，但四组集合分别证明 passed、failed+Record、not-applicable与 unavailable，具有独立消费价值。
- Schema无法单独证明跨文件 generation一致；文档必须继续要求 complete-set fingerprint validation。
- 同一 output owner同时服务 consumer和repository维护者；分层比复制一份 package-only说明更能避免第二事实源。

## Open Questions

无。用户已确认 machine output contract 可以随 package 发布；当前范围采用现有两份 v4 schemas和四组 current examples。
