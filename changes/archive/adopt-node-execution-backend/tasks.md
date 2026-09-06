# Tasks

按 Product host 方向、Worker 实现、package contract、consumer 验收和稳定文档的依赖顺序实施；以真实 Node exact-candidate Run 和完整 Gate 为完成出口，不迁移仓库脚本。

## Readiness

- [x] 0.1 建立并激活 Node-only package host 与 Node-readable ESM layout successor Decisions，演进两个直接冲突的 Bun product Decisions；不触碰 repository entry、Test Evidence 或 package-manager Decisions。
- [x] 0.2 以锁定 Node 24.18.0 与 Bun 1.3.14 原型确认 `node:worker_threads` 可由现有 Bun 测试承载，并闭合 message/error/exit 顺序、未发消息退出失败和 Node acceptance command binding 方案。
- [x] 0.3 在修改测试正文前运行 Test Evidence 完整闭合基线，并核对 function-metrics、package lifecycle 与 consumer documentation owner。

## Implementation

- [x] 1.1 将 function-metrics parent/Worker transport 迁移到 `node:worker_threads`，保持单次结算、取消、失败闭合、完整 batch 和 shipped Worker URL 契约，并调整相邻测试 seam。
- [x] 1.2 将 generated manifest、artifact audit 和 formal release receipt 从 Bun engine 原子迁移到 Node `>=24.18 <25`，更新 schema 版本及相邻测试。
- [x] 1.3 为 external-consumer acceptance 绑定 mise 锁定的绝对 Node executable，让 dependency bin 和 installed runtime fixture 由 Node 执行并记录/核对实际 Node 版本。
- [x] 1.4 同步 README、public JSDoc、package guides、Architecture 与 package lifecycle owner，清楚区分 Node-only Product 和仍由 Bun 拥有的 repository tooling。

## Verification

- [x] 2.1 运行 function-metrics Worker、resource/cancellation、artifact manifest、release receipt 与 external-consumer 最窄测试，再运行完整 Test Evidence 闭合并审阅 Case 证据。
- [x] 2.2 冷构建 exact candidate，验证 manifest/receipt/material audit，并由锁定 Node 24.18.0 完成 external types/docs/runtime acceptance，包含 Worker-backed function metrics。
- [x] 2.3 运行 docs API projection、docs validation、Decision check、Change check、dependency/entry checks 和 `git diff --check`。
- [x] 2.4 运行默认 `bun run check` 与 `bun run check -- --all`，确认现有 Bun tooling 完整通过且 Node package-consumer runtime lane 通过。
- [x] 2.5 由非实施代理从实际 diff独立反查 Product/文档影响、Node-only边界和测试证据，处理全部阻断发现。
- [x] 2.6 逐项复核 Success Criteria；仅在实现与验证完成后标记 successor Decisions aligned，并请求单独的 Change归档授权。
