# Design

本 Draft 区分 SCC native capability 与 Vibe Check 应公开的稳定 Product capability，并为后续单项判断建立最小入口。

## Context

- 已归档的 `upgrade-scc-file-metrics-to-v4` 固定 SCC 4.0.0、`--no-config`、exact inputs 和十列 CSV contract；corpus
  确认当前不需要 Product-owned private config。它的 Linux differential evidence 仅证明那次 migration，不授权 API
  扩张，也不承诺所有平台、语言或后续 SCC release。
- `fileMetrics` 的稳定结果只有 code-line finding、Record 和 final data；threshold 仍由 area owner 以非阻断观测策略
  拥有。consumer contract 的 owner 是 `docs/checks/file-metrics.md`，scanner-private boundary 的 owner 是
  `docs/development/scanner-dependencies.md`；本 Draft 不替代这两个 owner。
- scanner dependency owner 禁止把 SCC、Lizard 与 jscpd 合并为 shared registry 或 generic backend interface。
- 本 Draft 不授权 runtime 实现，也不阻塞 Lizard 或当前 scanner implementation。

## Goals / Non-Goals

**Goals**

- 判断每个 candidate 是否有独立的 consumer outcome、唯一 owner 和可重复的 acceptance evidence。
- 只有 candidate 能形成稳定 Product contract 时，才提出最小 public expansion。

**Non-Goals**

- 不在 Draft 期间修改 `fileMetrics` runtime、scanner protocol、threshold 或 package API。
- 不建立 generic scanner surface，也不为 SCC 的全部 native capability 寻找 public outlet。

## Decisions

### Intended Change

在进入 Plan 前，所有 candidate 默认维持 private。只有一个具体 candidate 回答完以下问题并遵守 Guardrails，才可进入
Intended Change：

1. 是否有真实 consumer case 需要一个可理解、可验证且不破坏 exact-input ownership 的 outcome？
2. 若有，该 outcome 应由 `fileMetrics` policy、private Product-owned config 还是 adapter 持有？
3. 若公开，它将如何影响 authoring/resolved options、public docs、validation、fingerprint/cache identity、custom
   executable compatibility 和 installed-consumer acceptance？
4. 哪些 native capability 必须明确拒绝，例如 arbitrary args、external config path、reporter、Git/history、MCP 或未进入
   stable metrics 的 fields？

### Resulting Impacts

- 若一个 candidate 被公开，必须同步 closed option schema、default、validation、package guide、declaration projection 和
  candidate/consumer evidence。
- 若没有 candidate 成立，本 Draft 记录“不扩张”结论；不创建没有真实 consumer 的 abstraction 或 configuration。

## Risks / Trade-offs

- 过早公开 config 或 args 会把每次 SCC release 与 consumer compatibility 绑定，并失去 adapter 的 fail-closed protocol
  boundary。
- 永不扩张可能迫使 consumer 使用 external wrapper；只有 evidence 证明稳定需求时，才足以抵消这一成本。

## Open Questions

- 哪个真实 consumer scenario 不能由当前 executable-only contract 安全满足？
- 某项 candidate 的 Product name、default 和 failure semantics 是什么，而不是 SCC CLI spelling？
- 是否有 candidate 可以由 private Product-owned config 满足，从而不应成为 public API？

## Guardrails

- 不以 SCC CLI flag 名称替代 Product contract；先定义 consumer outcome、default、failure 和 evidence。
- 不公开 arbitrary command prefix、args 或 external config path。
- 不引入 shared scanner abstraction，且没有真实 consumer case 时不增加 option、metric 或 cache schema。
- public expansion 必须独立通过 API/consumer compatibility、Test Evidence 与完整 Gate；本 Draft 期间不修改当前 runtime。
