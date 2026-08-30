---
title: 仅允许显式受控的 JSON Schema 引用来源
status: active
alignment: aligned
createdAt: 2026-08-30T17:33:59Z
purpose: 在默认离线的前提下支持本地、随包固化和显式 allowlist 的 Schema 引用，并封闭网络与输出边界。
background: 常见 Schema 会引用外部资源，但任意 loader、ambient credential 或原生错误会扩大安全与公开契约。
decision: jsonSchemaValidation 只按 closed policy 解析 local、bundled 与 allowlisted HTTPS 引用。
tags:
  - configuration
  - product-contract
relations:
  - type: 重划
    target: allow-controlled-json-schema-reference-sources.md
  - type: 重划
    target: complete-first-release-check-set-without-markdown-structure.md
  - type: 重划
    target: expand-format-aware-built-in-checks.md
---

## 目的

- 让 JSON Schema Check 覆盖常见、已知的引用来源，同时不因文档中的 URI 自动取得网络或 credential 权限。
- 让 authoring identity、解析来源、transport failure 与 public evidence 都由一个封闭的 Check-owned 契约解释。

## 背景

- 纯 invocation-local registry 无法覆盖所有常见 Schema 引用，但开放 callback、redirect、header 或 ambient authentication 会绕过调用方可审计的安全边界。
- 当前 `jsonSchemaValidation` 已拥有默认离线、显式 allowlist、受限 remote adapter 与安全输出投影；这些义务不应继续依附首发 Check 数量决策。

## 决策

- 采用: Check-level schema identity policy 是 `require-match`、`configuration-authoritative` 或 `document-authoritative`，默认 `require-match`；同一 Check 不按单个 Schema 混用，public authoring ID 始终唯一且用于 binding 与 Record identity。
- 采用: reference policy 默认 `{ mode: "offline" }`，只解析 invocation 显式注册的 Schema；只有 `{ mode: "allowlisted", sources }` 才额外按 local registry、随 package 固化且可验证的 bundled catalog、明确匹配的 HTTPS source 顺序解析。
- 采用: HTTPS source 只声明安全 source ID、exact HTTPS origin 与 path prefix；不支持 URL userinfo/query、任意 headers 或 credentials、ambient auth、开放 callback loader、非 HTTPS、未授权 host/path、redirect 或远端持久缓存。
- 采用: package-private remote adapter 使用固定 timeout、response byte limit、并发与 invocation-local de-duplication。未授权或不可解析引用安全失败；已授权 source 的 transport failure 由 owning Check 结算为 `unavailable`。
- 采用: public evidence 只投影 allowlisted authoring identity、normalized path、pointer、keyword 与 closed reason；不公开 response bytes、absolute path、credential、transport-native message 或未经许可的 `$id`/`$ref` 内容。
- 不采用: 因 Schema 出现 URI 自动联网，或由 Run Controls、environment、Gate 与 generic Product-wide resolver 提升引用权限。
