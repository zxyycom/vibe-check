# Design

本设计先修复通用 Finding waiver 的发现路径和能力矩阵，不借文档调整静默扩大任何内置 Check 的 public options。

## Context

- aligned Decision `provide-generic-finding-waiver-reconciliation.md` 明确该 helper 同时面向 custom 与 Product-provided Checks，并只拥有 identity matching、disposition 和 audit。
- `src/index.ts` 已从 package root 导出 `reconcileFindingWaivers` 及其 public types；`docs/api-mechanics.md` 拥有完整 grammar、canonical identity 和 `unused | applied | overmatched` 语义。
- README 在介绍 Finding policy 时没有直接命名或链接 waiver helper，只在自定义 Check 章节把 waiver 对账列为进阶能力。
- 当前只有 `fileMetrics` 在内置 options 中接入 `findingWaivers`；duplicate、function 与 Markdown Finding producers 仍只拥有各自的 finding policy 和 Records。

## Goals / Non-Goals

**Goals**

- 让只阅读 README/Configuration 的 consumer 能发现公共 helper，并知道它不是 custom-Check 专用工具。
- 明确 helper 与内置 Check option 是两层能力：通用机制已存在，领域接入仍由 producing Check 决定。
- 保持 waiver 的可审计语义，避免“精准忽略 warning”被理解为删除证据或过滤任意 message。

**Non-Goals**

- 不在本 Draft 中承诺 duplicate、function 或 Markdown Check 一定增加 `findingWaivers` option。
- 不改变 Finding policy、Record identity、Check outcome、Gate aggregation 或 bounded presentation。
- 不新增 waiver registry、Core finding owner、glob suppression 或扫描前排除机制。

## Decisions

### Intended Change

暂定以文档发现性为首个闭环：在 README 的随包质量 Check 区域增加公共 waiver 入口和最小语义示例；在 Configuration 增加当前能力矩阵；让 API mechanics 继续拥有完整契约，并由各 Check 指南只记录自己的领域接入。package 文档投影与 installed documentation acceptance 必须覆盖新增入口。

若后续决定为某个内置 Check 增加原生 waiver option，应由该 Check 独立固定 semantic identity、closed authoring、audit Records/messages、blocking count 和 no-input 行为；不得因为 helper 通用就复制 `fileMetrics` 的 path identity。

### Resulting Impacts

- README、Configuration、API navigation 和 package documentation acceptance 需要保持同一能力矩阵，避免把 helper 可用性与内置 option 覆盖混为一谈。
- `fileMetrics` 指南继续拥有当前 `{ metric, path }` identity；通用文档只链接，不复制其完整领域 grammar。
- 若本 Draft 保持 docs-only，public exports、类型、schema 与运行时行为不变；验证重点是链接、示例投影和 installed docs。

## Risks / Trade-offs

- 能力矩阵会随内置 Check 接入变化，需要让对应 Check Change 同步更新唯一矩阵 owner。
- 只改善发现性不能让尚未接入的内置 Check 直接接受 waiver；但在没有稳定领域 identity 前统一加 option 会制造虚假通用性。
- 把 waiver 简称为“忽略 warning”更易理解，却会掩盖保留 Finding 与审计 stale/overbroad 配置的核心安全价值。

## Open Questions

- 本 Change 是否保持 docs-only，还是同时为一个已有真实需求的内置 Finding producer增加原生 waiver option？
- 当前能力矩阵由 README 还是 Configuration 作为唯一 owner，另一处只做摘要和链接？
