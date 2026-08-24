# Design

本设计让 Markdown Link Check只拥有离线 occurrence classification、本地 target resolver和 anchor verdict；共同 parser保持 package-private。

## Context

`add-markdown-structure-validation` 将建立 parser-neutral Markdown document model。当前 Product没有 invocation-private cross-Check material channel；`dependencies.get`只读取会进入 Core/machine的 canonical final data，因此不能承载 raw或credential-bearing external URL。长期网络授权决策也要求独立、显式 opt-in。首版据此删除旧 external snapshot/handoff范围。

`collectScanFiles` 提供 global normalized candidates，但普通本地链接可能指向非 Markdown资源。Resolver只能查询该 inventory和受控 filesystem metadata，不能以 existence fallback扩大全局 scope。

## Goals / Non-Goals

**Goals**

- 对 Markdown本地 file/anchor occurrences给出确定、可行动且安全的离线结论。
- 与 Structure Check共享 parse/heading facts，同时保持独立 options、Records与 result。
- 明确 external URLs零网络、零持久 request material的首版边界。

**Non-Goals**

- 不实现 reachability、redirect、retry、rate limit、network cache或 credential propagation。
- 不创建 private Core entity、ephemeral cross-Check registry或 public candidate DTO。
- 不解析 generic prose paths、imports、HTML attributes或 generated JavaScript links。

## Decisions

### Intended Change

1. **Occurrence owner。** 支持 inline links、resolved/unresolved reference links、images和 GFM autolinks；code span/fence、HTML attributes与 plain prose URL不进入。Markdown destinations归本 Check，不交给 Path Reference重复处理。
2. **Strict classification。** 对 destination做一次受控 percent decode并拆分 path/query/fragment，分类为 same-document anchor、project-local target、cross-document anchor、absolute/file URI、project escape、external HTTP(S)/protocol-relative、mailto或 other scheme。External分类后立即停止，不保留 raw value。
3. **Inventory-first local resolver。** 相对 path以 source directory为 base，lexically normalize后必须仍在 project namespace并属于 global inventory。普通 target只验证 inventory与 file type；cross-document anchor只有在 target为 approved Markdown ordinary file且 realpath仍在 root内时才读取共同 parse facts。
4. **Deterministic Product slug dialect。** Heading slug算法作为 private versioned implementation固定 Unicode normalization/lowercase、标点处理、whitespace与 duplicate suffix；用 fixtures锁定，不宣称兼容所有 renderer。若选择成熟 slug dependency，同样封装且进入 dependency/license evidence。
5. **Safe Records。** Closed reasons为 `invalid-encoding | undefined-reference | missing-target | target-not-file | missing-anchor | target-not-markdown | absolute-filesystem | project-root-escape | symlink-root-escape`。Data只含 source path、link kind、safe normalized target/fragment、semantic ordinal与可选 location；boundary reason不复制 raw absolute target。
6. **Status和资源 bounds。** 无 source inputs为 `not-applicable`；正常 issues为零 `passed`，否则 `failed`；source/target read、parse、cancellation或 protocol failure为 `unavailable`。Issue/target-read上限达到时失败关闭并在 final data标明，不能静默通过。
7. **Public closure。** 新 value/options/runtime validation、exports/contract、owner docs/examples、semantic Cases与 exact installed candidate同步；不增加 network option或 shared file policy。

### Resulting Impacts

- Structure与Link tests共同拥有 parser/heading fixture corpus；Link另有 resolver/security fixtures。
- Future Network Link Check必须重新选择自己的输入 acquisition和敏感材料边界，不能依赖已删除的 snapshot假设，也不能改写本 Check的 offline verdict。

## Risks / Trade-offs

- Renderer slug差异会产生边缘不一致；明确 Product dialect与 fixtures比跟随依赖隐式升级更可审计。
- Inventory membership会把 excluded target报告为 unresolved而非证明“不存在”；Record reason和文档必须使用 target unavailable语义，不夸大 filesystem事实。
- URL parsing可能接触 credentials；classification函数不得把 raw destination放入 error、Record、message或 cache，credential canary覆盖异常路径。

## Open Questions

无。Slug dependency是 Readiness 中的 private实现选择。

## Implementation Observations

2026-08-24 已删除旧 Plan 的 network snapshot、`requiresChecks`/Task依赖、shared policy、named reference、comparison/cache和 `src/product/**` seam；当前 Plan完全离线。
