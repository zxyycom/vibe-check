---
title: 将安全秘密检测纳入随包 Check 契约
status: active
alignment: aligned
createdAt: 2026-09-03T11:55:10Z
purpose: 把安全、显式范围的秘密检测作为第八项随包 ordinary Check 纳入公共构造、解析和材料验收契约。
background: 现有七项 Check 契约未覆盖必填 files、私有原始材料边界和安全 Finding waiver 的秘密检测能力。
decision: secretDetection 要求显式 files、固定高置信规则和受限本地内存，并以安全 identity 使用通用 waiver 对账。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: provide-package-check-functions-parsers-and-actionable-messages.md
---

## 目的
- 让 package consumer 能以显式 files policy 使用一项高置信、随包的秘密检测 Check，并可安全读取其 parser、类型、Records 与结果。
- 让该能力不会把原始秘密、message、substring 或 value-derived digest 扩散到公共 API、输出、缓存、日志或错误边界。

## 背景
- 已有随包 Check 契约固定为七项，不能由局部 Change 进度暗中扩展第八项公共能力。
- Secretlint `@secretlint/core@13.0.5` 的内存 result 含 `sourceContent`，因此上游 masking 不能替代 producing Check 的私有适配和安全投影。
- 通用 `reconcileFindingWaivers(...)` 已能按完整 Finding 集合审计结构化 waiver，但 adopting Check 仍必须拥有自己的 identity、Records、coverage 与 status。

## 决策
- 采用: `secretDetection({ files })` 是第八项随包 ordinary Check。它要求完整 `{ source, include, exclude }` files policy，且只把 owning Check 选择和批准的 exact project-relative paths 交给 detector；不提供全仓库 fallback、history、environment、home、remote 或 binary discovery。
- 采用: v1 固定使用 MIT 许可、[Secretlint monorepo release `v13.0.5`](https://github.com/secretlint/secretlint/releases/tag/v13.0.5) 提供的 `@secretlint/core@13.0.5` 和 `@secretlint/secretlint-rule-privatekey@13.0.5`，只启用 private-key rule。规则数固定为一，顺序处理、每文件 1 MiB、总计 8 MiB、最多 2048 个 selected files，并在每次文件和 detector 边界检查 cancellation。
- 采用: detector、分类和文件读取只在 invocation-owned bounded memory 保留原始材料。adapter 只向 Check execution 返回 allowlisted rule ID、project-relative path、safe line/column、`text-document` structural class 和 occurrence ordinal；不返回、记录、序列化、插值或持久化 third-party result、source、message、data、exception、stack、hash 或 value substring。
- 采用: 在受支持 POSIX runtime 中，exact final leaf 用 `O_NOFOLLOW` descriptor 打开并由同一 descriptor 验证 regular-file 与 size；每次成功 bounded read 都消耗 total-byte budget，即使内容随后成为 non-text gap。oversize、file-count/total-byte limit、NUL 和 invalid UTF-8 是不可豁免的 deterministic coverage gaps，并使正常结果为 `failed`；selected symlink、non-regular/no-follow unsupported、file collection/read、detector throw、unexpected detector protocol 和 cancellation 是 `unavailable`，不伪造 clean 或 partial result。
- 采用: secret finding identity 只由 rule ID、path、structural class 与 ordinal 组成。完整安全 finding 集合形成后使用通用 waiver reconciliation；唯一匹配保留 finding 并记录 reason，unused/overmatched 保留 audit，coverage gap 和 unavailable 不受 waiver 影响。
- 采用: package root、README、Check guide、public inventory、第三方 license receipt、candidate 和 external consumer 同步维护这项 Check。合成且非真实 credential 的 canary 覆盖安全 output surface；不在产品结果、基线或文档示例保存 canary 或 derived digest。
- 采用: `docs/checks/secret-detection.md` 的 package Check owner 维护固定 rule set、依赖升级和 synthetic corpus。每次 Secretlint release、engine 或 dependency graph 变化都必须重跑 package candidate、installed consumer 和全 surface leak-canary evidence。
- 不采用: detector-native allowlist/baseline、任意 regex/command、按消息文本抑制、值 hash identity、持久化后清洗或 Product-wide detector registry。
