# Tasks

Plan stage 固定完整兼容迁移的工作与验收，但 implementation 保持暂停；只有 Resume Conditions、0.3 与明确实施授权闭合后，才开始修改产品代码。

## Readiness

- [x] 0.1 已对照当前 owner、aligned language Decision 和实现 registry 审计旧 Change，确认其 TypeScript/Rust-only 范围不能继续实施，并保存形成时调查报告。
- [x] 0.2 已固定新 Plan 的 Lizard 1.23 oracle、27-reader/55-extension full-parity、hard cut、无 fallback、无 SCC/generic framework、无 1.24 upgrade 与 public scanner migration 边界。
- [ ] 0.3 实施前取得明确授权和优先级确认，重新核对当前 public/Record/language owners，并提交 consumer 安装或 Decision 列明的提前证据、license/provenance 路径与安装/performance baseline。

## Implementation

- [ ] 1.1 建立每个 reader/family 与 extension 的 responsibility ledger、checked-in source fixtures、Lizard 1.23 oracle observations，以及 normal/edge/malformed/read/cancel/order/cache differential corpus。
- [ ] 1.2 按语料证明的 common/family boundaries 实现 Product-owned TypeScript analyzers、normalized results、exact-path resource handling、signal/cancellation 与 owner-level measurement conversion。
- [ ] 1.3 一次切换 callback/cache backend identity，删除 Lizard availability/process/parser/CSV、Python/Lizard dependency与 tool binding、production fallback 和 public `scanner.executable`，并同步 types、docs、package materials 与受影响 Decisions。

## Verification

- [ ] 2.1 对每个 reader/family 和全部 registered extensions 运行 differential 与 edge/malformed/read/cancel/order/cache 最窄测试，并用 Test Evidence ledger 闭合新增、删除或重命名的 Case。
- [ ] 2.2 运行 product typecheck、lint、目标/全量测试、dependency/import/process trace、candidate/installed consumer 与受 budget 约束的 performance observation，证明无 Python/Lizard runtime path 或 stale cache hit。
- [ ] 2.3 运行 docs/Decision/Change checks、required 与 full Project Gate，复核 full parity、public migration、license/provenance、package notices、owner 对齐和无 fallback/能力收窄后再交付。
