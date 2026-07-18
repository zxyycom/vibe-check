## Context

`src/product/config.ts` 当前通过 `report.nonBlockingNotice` 和 `report.footerNotice` 提供人读报告文案。这两个稳定配置槽位仍把已退役的 Rust CLI、schema 和 tests 描述为当前 release contract 或 release gates；渲染器及机器可读 artifact 并不存在相同问题。

`generateMarkdownReport` 只在标题和 footer 中插入这两个配置值；`metrics.json`、warning artifacts、status 计算和报告 section 生成均使用独立路径。因此该变更只需修正两个字符串并补充产品层测试，无需改变配置模型、渲染流程或输出协议。

## Goals / Non-Goals

**Goals:**

- 让两类 notice 准确指向当前 TypeScript/Bun 产品、产品契约与产品测试。
- 保留 notice 的非阻塞快照语义。
- 证明完整人读报告在既有位置呈现新文案，且不再声明 Rust runtime 是当前 release owner。

**Non-Goals:**

- 不改变 artifact shape、字段、status、section 顺序、报告结构或机器可读输出。
- 不重命名 report 配置字段，不新增 notice registry、formatter 或其它抽象。
- 不处理其它历史 Rust 提及，也不扩大到 CLI、schema 或长期文档迁移。

## Decisions

### Decision 1: Replace only the two owned string values

实现只替换 `report.nonBlockingNotice` 和 `report.footerNotice` 的字符串值，保留配置键、读取路径和渲染结构。这样可直接修复错误所有权，同时把可观察变化限制在人读文案。

未采用重构 report config 或引入共享 notice builder 的方案，因为两个固定字符串没有值得抽象的变化维度。

### Decision 2: Name the current product boundary without preserving Rust wording

顶部 notice 将 TypeScript/Bun 产品 CLI、报告契约和产品测试描述为 release contract；footer notice 将 TypeScript/Bun 产品测试与契约校验描述为 release gates。两者保留 non-blocking development snapshot 语义，不再把 Rust CLI、Rust schema 或 Rust tests 描述为当前 owner。

未采用泛化为“current product”的模糊措辞，因为明确所有权更容易在后续迁移时发现陈旧文案。

### Decision 3: Test observable human output and structural invariants

产品层聚焦测试使用 `DEFAULT_CONFIG.report` 生成完整人读报告，验证顶部 notice 位于标题后、footer notice 位于报告末尾、新所有权文案出现且旧 Rust owner 文案消失。配置键、渲染调用链和机器 artifact 边界由聚焦 diff、既有产品测试及 workspace validation 共同保护，不新增 snapshot 基础设施。

## Risks / Trade-offs

- [Risk] 将精确英文文案写死在测试中会让纯措辞微调需要同步测试。→ Mitigation：只对这两个有契约意义的 notice 使用精确断言，并以结构不变量限制变更范围。
- [Risk] 相邻重构可能无意扩大输出变化。→ Mitigation：任务和验证明确要求检查聚焦 diff、产品测试与既有输出契约验证。

## Migration Plan

1. 增加产品层聚焦测试，先固定两处 notice 的所有权、位置和边界。
2. 更新两个现有字符串，并用聚焦 diff 确认改动范围。
3. 运行产品 typecheck、lint、test、workspace validation 和 OpenSpec validation。
4. 若验证失败，回滚两个字符串和对应测试即可；无需数据迁移或兼容层。

## Open Questions

无。
