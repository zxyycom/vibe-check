# Design

本设计共享 selected/accepted/rejected 对账不变量，但让每个 producing Check 保留 eligibility、Record、message、计数与终态责任。

## Context

`collectProjectFiles` 与 `collectProjectFileSets` 只实现调用方声明的 source/include/exclude；支持哪些文件类型属于 owning Check。形成 Change 时，function-metrics、JSON validation 与 Markdown Link 在收集后调用本地 predicate 过滤路径，而被拒绝路径没有事实输出。duplicate/file metrics 不做这层 Product filter；JSON Schema 的 selected set 是显式声明路径的读取授权范围，不是自动 work list。

公开 `defaultProjectFileSelection` 仍是通用、可组合的 `{ source, include, exclude }` 基线。若每个 Check 直接物化它的 `include: ["**/*"]`，启用拒绝 Finding 后会把隐式默认发现的无关类型也当作调用方有意输入；Check-specific default include 应与其 eligibility 使用同一事实源，显式 include 仍完整替换。

## Goals / Non-Goals

**Goals**

- 让 Product 内部的 supported-file filter 不再静默丢失 selected paths。
- 用一条 per-path Record 和一条 per-Check 汇总 message 兼顾完整证据与终端噪声。
- 保持拒绝 Finding non-blocking，并准确区分 domain finding、invalid document 与 unsupported file type。

**Non-Goals**

- 不推断外部 scanner 为何没有返回某个已接受 input，不把零函数、零重复或零 SCC row 自动解释为拒绝。
- 不把 eligibility 提升为 Product-wide language registry、公共 generic finding type 或跨 Check aggregation input。
- 不读取文件内容猜测类型，不提供 glob waiver、自动修复或隐藏拒绝 Finding 的选项。

## Decisions

### Intended Change

- collection 继续返回完整 selected paths；`project-files/input-eligibility.ts` 的无状态 helper 只承接保持输入顺序且不丢失路径的 partition 不变量。三个 adopting Check 分别提供自己的 eligibility predicate，并继续拥有 rejected Record、message、计数和终态语义。
- 统一拒绝事实名为 `kind: "input-rejected"`、`reason: "unsupported-file-type"`、project-relative `path` 与 `blocking: false`；function-metrics 另外保留稳定排序的 `codeAreas`。Record ID 使用 `/input-rejected/<path>` 独立域。
- 默认 files 从公共 baseline 派生 source/exclude，但 include 由 Check-owned eligibility 产生：lower-case JSON、case-insensitive Markdown 与 Lizard 1.23.0 official extensions。显式 include 完整替换，不因结果量大而省略拒绝。
- all-rejected 代表 Check 成功完成输入分类并形成 non-blocking findings，因此返回带 final data 的 `passed`；真正 zero selected paths 才返回 `not-applicable / no-eligible-input`。
- JSON rejected inputs 纳入 `issueCount` 但不进入 `invalidFileCount`；Markdown rejected inputs 与 link findings 一同纳入 `findingCount`，并以 `rejectedInputCount` 保持可解释；function-metrics 使用既有 finding summary，并把 rejection candidate 固定为 non-blocking。

### Resulting Impacts

- project-files resolution 需要接受一个 trusted Check-specific fallback selection，并继续为每次 constructor 生成 detached/frozen resolved value；公共 baseline 本身不改变。
- function-metrics target module 必须以同一 extension registry 产生 predicate 和 default globs，防止默认范围与 runtime eligibility 漂移；大小写匹配语义保持一致。
- JSON 与 Markdown 的 Record data 成为明确 union；public export/type inventory 与 docs 必须让 consumer 能判别 rejection branch。
- Markdown traversal 的 occurrence-based invariant 调整为 link finding count 不超过 occurrence count，rejected count 独立；JSON parser 调整 issue-count 等式。
- repository Gate 的 Markdown Check 只选择 docs/changes Markdown，不再用同时包含 TypeScript 的共享 repository selection。

## Risks / Trade-offs

- 显式 `include: ["**/*"]` 可能产生大量 Records；这是完整反映调用方输入的预期代价，终端只汇总数量，调用方通过精准 include/exclude 降噪。
- Check-specific default include 会改变 resolved options projection，但 accepted work set 保持原有 eligibility，因此不会扩大文件读取或 backend handoff。
- 新 Record branches 与 final count 字段会扩大首个公开版本前的 public contract；必须同步 parser、declaration inventory、examples 和 docs，而不是保留旧 shape 双读。

## Open Questions

无。用户已确认所有 selected-but-rejected paths 都应输出，降噪通过精确选择完成而不是抑制事实。
