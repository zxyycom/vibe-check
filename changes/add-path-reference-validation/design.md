# Design

本设计保留 inventory-only path resolver方向，但把 grammar与输入分段放回真实 corpus驱动的恢复门禁。

## Context

当前 Product只共享 global file scope；没有跨 Check parser-segment channel，也不应把 Markdown facts写入 Core/machine只为另一个 Check消费。Markdown Structure/Link首版会提供 package-private parser implementation，future Path Check可以直接复用函数而不依赖它们的运行结果。

长期 Decision把 path reference保留为独立 future Check，但不决定优先级或具体 grammar。首版排序 Decision明确将它后置，因为误报和 segmentation语义成本高于实现一个 regex/classifier本身。

## Goals / Non-Goals

**Goals**

- 以真实 corpus证明一个窄、稳定、可解释的 project-local path grammar。
- 只使用 approved source segments和 inventory-derived target index。
- 保持 Markdown links、module imports与 prose paths的 occurrence owner互斥。

**Non-Goals**

- 不追求任意自然语言路径召回率。
- 不建立 cross-Check data channel、shared file policy或 target filesystem scanner。
- 不作为首次公开发布前置。

## Decisions

### Intended Change

1. **先证明 precision，再固定 grammar。** Resume spike至少覆盖本仓与两个不同文档布局的 synthetic/consumer corpus，记录 supported/unsupported tokens和误报；没有可接受 evidence时继续暂停。
2. **Segments是 private实现复用。** Markdown visible prose/inline-code由共同 parser函数产生；plain text只有 Check-owned options显式选择且通过 bounded UTF-8分类时进入。不会通过 Check dependency final data传递 segments。
3. **Resolver只用 logical namespace。** Relative token以 source directory为 base，root-relative token以 project root namespace为 base；normalize后只查询 immutable inventory file/directory sets。Escape在 lookup前关闭。
4. **Records只表达高置信 defect。** Unsupported/ambiguous token不产生 Record；accepted token的 unresolved/escape才报告。ID由 source path、safe normalized target/reason与 semantic ordinal组成，location只用于导航。
5. **Ordinary Check closure。** Future value/options/runtime validation、final counts和 four-state result沿用现有 contract；没有 Manager、TaskPlan、comparison/cache或 shared catalog。

### Resulting Impacts

- Markdown parser完成并不自动解除暂停；corpus precision和明确实施优先级才是恢复条件。
- Future grammar扩展必须由新 evidence支持，不能静默把 unsupported text升级为缺陷。

## Risks / Trade-offs

- Narrow grammar会漏报，wide grammar会破坏信任；首版后恢复时优先 precision并明确 unsupported边界。
- Inventory miss不能证明 host filesystem不存在；Record应表达 unresolved-in-approved-scope而不是绝对 missing。

## Open Questions

- 哪个真实 consumer corpus与 false-positive budget足以进入 implementation。

## Implementation Observations

2026-08-24：因输入 segmentation和误报风险，本 Change不属于首次公开 release gate。恢复前需重新审阅当前 Markdown helper、scope与 public surface，并刷新 Plan baseline。

## Resume Conditions

1. 首版四项离线 Checks 已完成，或用户基于真实需求明确提前。
2. 已获得可提交的 representative corpus，并给出可检查 precision/false-positive验收。
3. Segment owner无需新增公共或持久 cross-Check channel。
