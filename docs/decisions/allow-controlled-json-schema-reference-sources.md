---
title: 在首发 Checks 中提供受控 Schema 引用
status: active
alignment: unaligned
createdAt: 2026-08-25T08:08:27Z
purpose: 让首次公开 package 交付五项默认 Check，并以默认离线、显式授权的方式支持 JSON Schema 引用。
background: 首发 Check 集已确定，但纯离线 registry 不能覆盖常见已知 schema 引用；任意网络 loader 又会越过安全边界。
decision: 首发完成五项 default Checks；jsonSchemaValidation 以 closed policy 解析 local、bundled 与 allowlisted HTTPS 引用。
tags:
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: complete-first-release-check-set-before-publication.md
---

## 目的

- 让首次公开 package 除现有代码指标外，提供严格 JSON、JSON Schema、Markdown 标题结构、本地链接和维护提醒五项直接可用能力。
- 让 JSON Schema 能处理项目实际使用的、可明确授权的外部 `$ref`，同时保持默认离线和 ordinary Check/options 边界。
- 让网络、schema source、schema/instance bytes 与 engine-native failure 不扩散到 Core、Record、final data、日志、artifact 或缓存。

## 背景

- 当前 Product 已有 ordinary Check、closed options、four-state final result、Check-local Records、terminal messages 与统一 Run scheduling；五项首发能力不需要新的 Core entity。
- 严格 JSON、Markdown 标题和本地文件/anchor links 仍是确定性离线能力。JSON Schema 的 `$schema` 与 `$id` 使用 URI 不应自动请求网络；只有未由 local/bundled source 满足的外部 `$ref` 才需要受控读取。
- 纯离线 registry 对无外部引用的项目可复现，但不能承接常见官方 meta-schema 或项目明确授权的 schema registry。任意 loader、环境变量或 Gate 则会绕过 Definition snapshot、网络授权、SSRF 和敏感 URL 边界。
- 网络 Check 的现有方向要求 Check-owned explicit opt-in；严格 JSON boundary、四态 result 与敏感材料规则可承接 document、transport 和输出分层。

## 决策

- 采用：在首次公开发布 `vibe-check` 前完成并验证 `jsonValidation`、`jsonSchemaValidation`、`markdownStructureValidation`、`markdownLinkValidation` 与 `maintenanceReminders` 五个 Product-provided ordinary Check values。
- 采用：Maintenance reminders 保持一个 fixed-ID executable Check；项目用 native object composition 替换其 closed options，不增加 constructor、factory、第二 Check family 或 reminder-level Check/Record identity。
- 采用：`jsonSchemaValidation` 的 Check-owned closed options 声明一个 Check-level schema identity policy：`require-match`、`configuration-authoritative` 或 `document-authoritative`。默认 `require-match`；策略不得按单个 schema 混用。public authoring ID 始终保持唯一、安全且用于 binding/Record identity。
- 采用：reference policy 默认 `{ mode: "offline" }`，只解析本次 invocation 显式注册的 schema；`{ mode: "allowlisted", sources }` 才允许额外来源。resolver 固定按 local registry、bundled catalog、明确匹配的 HTTPS source 的顺序工作；`format` 维持 2020-12 annotation 语义而不加载 assertion plugin，Ajv `$async` schema 与 `$dynamicRef`/`$recursiveRef` 都安全失败。
- 采用：bundled catalog 只包含已随 package 固化、版本和内容可验证的明确资源；它不发起网络。HTTPS source 必须用安全 source ID、exact HTTPS origin 与 path prefix 声明；URL userinfo/query、任意 headers/credentials、ambient auth、开放 callback loader、非 HTTPS、未授权 host/path 与 redirect 都不被首版支持。
- 采用：remote adapter 是 package-private boundary，使用固定 timeout、response byte limit、并发与 invocation-local de-duplication；响应和 transport-native error 只在受限内存中存在。未授权或无法解析的 reference 是 safe schema failure；已授权 source 的 transport failure 由 owning Check 结算为 `unavailable`。
- 采用：schema document、engine resolution 和 public output 只公开 allowlisted authoring identity、normalized path、pointer、keyword 与 closed reason。任何 `$id`、`$ref`、response bytes、absolute path、credential 或 native message 都不得成为 public fact。
- 采用：每条 maintenance reminder 使用 immutable full commit object ID 和 first-parent history 度量 commits/累计 changed lines；Git/history failure 为 `unavailable`，不伪造 clean assessment。
- 采用：五项能力完成后，重新生成 exact package candidate，更新 public declarations、README/API guide、runtime dependencies、license、semantic Cases，并通过 required/full Gate 后才进入公开发布准备。
- 采用：`path-reference-validation`、`network-link-validation`、`secret-detection` 与 Lizard TypeScript migration 保持首版后方向；只有新的真实 consumer、风险证据或明确优先级才恢复实施。
- 不采用：因 schema 中出现 URI 自动联网、由 Run Controls/environment/Gate 提升网络权限、Product-wide resolver/registry、任意 user callback loader、远端持久缓存、私有 registry 认证，或为赶首版降低 network/secret 安全边界。
