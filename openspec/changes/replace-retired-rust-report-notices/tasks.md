## 0. Blocking pre-implementation audit

- [x] 0.1 **审计通过。** Proposal、design、`output-contract` delta 和任务清单均将范围限定为两个既有的人读 notice；`output-contract` 是现有且唯一受影响的 capability；无开放问题；聚焦产品测试、局部 diff、产品验证和 workspace/OpenSpec validation 能共同证明文案更新及报告契约不变量。后续实现任务可以开始。

## 1. Focused behavioral evidence

- [ ] 1.1 新增 `src/product/config.test.ts` 聚焦失败证据：使用 `DEFAULT_CONFIG.report` 和 `createEmptyMetrics` 生成完整人读报告，断言顶部 notice 紧随标题、footer notice 位于报告末尾、两处文案标识当前 TypeScript/Bun 所有权，且不再包含旧 Rust owner 声明；不新增 snapshot 基础设施或报告抽象。

## 2. Notice replacement

- [ ] 2.1 只替换 `src/product/config.ts` 的 `report.nonBlockingNotice` 和 `report.footerNotice` 字符串，使其分别描述当前 TypeScript/Bun release contract 与 release gates，并保留 non-blocking development snapshot 语义。
- [ ] 2.2 用聚焦 diff 确认改动仅包含两个字符串和对应测试，配置键、渲染调用链、artifact writer、schema、status 与报告 section 结构保持不变。

## 3. Verification

- [ ] 3.1 运行产品 import 检查以及 `bun run typecheck:product`、`bun run lint:product`、`bun run test:product`，确认新增聚焦测试及既有产品测试全部通过。
- [ ] 3.2 运行 `bun run verify:vibe-check-workspace:required`、`bun run validate` 和 `openspec validate replace-retired-rust-report-notices --type change --strict --no-interactive`，记录任何无法运行的环境限制。
