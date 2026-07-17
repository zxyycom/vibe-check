本 change 的目标是替换 TypeScript 产品人读报告中两类已过时的 Rust release-contract notice；本文仅形成待审计临时设计，不修改其它文档、主规范或现有行为。

## Context

`src/product/config.ts` 当前通过 `report.nonBlockingNotice` 和 `report.footerNotice` 提供人读报告文案。这两个稳定配置槽位仍把已退役的 Rust CLI、schema 和 tests 描述为当前 release contract 或 release gates；渲染器及机器可读 artifact 并不存在相同问题。

该变更只需要修正两个现有字符串及测试证据，不需要改变配置模型、报告渲染路径或输出协议。

## Goals / Non-Goals

**Goals:**

- 让两类 notice 准确指向当前 TypeScript/Bun 产品、产品契约与产品测试。
- 保留 notice 的非阻塞快照语义。
- 证明渲染后的人读报告包含新文案且不再声称 Rust runtime 是 release owner。

**Non-Goals:**

- 不改变 artifact shape、字段、status、section 顺序、报告结构或机器可读输出。
- 不重命名 report 配置字段，不新增 notice registry、formatter 或其它抽象。
- 不处理其它历史 Rust 提及，也不扩大到 CLI、schema 或长期文档迁移。

## Decisions

### Decision 1: Replace only the two owned string values

实现 SHALL 只替换 `report.nonBlockingNotice` 和 `report.footerNotice` 的字符串值，保留配置键、读取路径和渲染结构。这样可直接修复错误所有权，同时把可观察变化限制在人读文案。

未采用重构 report config 或引入共享 notice builder 的方案，因为两个固定字符串没有值得抽象的变化维度。

### Decision 2: Name the current product boundary without preserving Rust wording

新的顶部 notice SHALL 将 TypeScript/Bun 产品 CLI、报告契约和产品测试描述为 release contract；新的 footer notice SHALL 将 TypeScript/Bun 产品测试与契约校验描述为 release gates。两者 SHALL 保留当前 non-blocking development snapshot 语义，并 MUST NOT 再把 Rust CLI、Rust schema 或 Rust tests 描述为当前 owner。

未采用泛化为“current product”的模糊措辞，因为明确所有权更容易在后续迁移时发现陈旧文案。

### Decision 3: Test observable human output and structural invariants

聚焦测试 SHALL 覆盖两个 notice 在最终人读报告中的出现、过时 Rust owner 文案的消失，并确认既有 report 配置键及相邻 section 结构未改变。测试不新增 snapshot 基础设施，也不修改机器可读 schema/examples。

## Risks / Trade-offs

- [Risk] 将精确英文文案写死在测试中会让纯措辞微调需要同步测试。→ Mitigation：只对这两个有契约意义的 notice 使用精确断言，并以结构不变量限制变更范围。
- [Risk] 相邻重构可能无意扩大输出变化。→ Mitigation：任务和验证明确要求检查聚焦 diff、产品测试与既有输出契约验证。

## Migration Plan

1. 完成阻塞级实现前审计并解除门禁。
2. 更新两个现有字符串，增加或调整聚焦测试。
3. 运行产品 typecheck、lint、test 和相关输出契约验证。
4. 若验证失败，回滚这两个字符串和对应测试即可；无数据迁移或兼容层。

## Open Questions

无未回答开放问题，可以进入实现前审计。
