# Tasks

按 source owner、调用链、证据和独立审查顺序完成本 Plan。

## Readiness

- [x] 0.1 核对 package lifecycle、artifact/candidate/release owners、Decision 列表与现有 Case。
- [x] 0.2 将 Draft 收敛为本 Plan，明确 source owner、root isolation 与安全边界。

## Implementation

- [x] 1.1 增加 checked-in release manifest sentinel，并实现显式-root reader 与 version-only projector。
- [x] 1.2 将 staging/tar/reuse/formal audit 传递 repository root，移除生产 dependency 平行 authoring list。
- [x] 1.3 使 fingerprint 绑定 JSON bytes，并使 Ajv/jscpd install/runtime probe 读取 static source。
- [x] 1.4 同步 lifecycle 说明与 Case owner。

## Verification

- [x] 2.1 运行 manifest、candidate receipt 与 artifact 目标测试和 TypeScript check。
- [x] 2.2 Test Evidence 557/557 通过；最终 `bun run check -- --all` 为 36/36 passed，另运行 formal release 两个目标文件的 5 个测试全部通过。
- [x] 2.3 非实施者已基于实际 diff 完成正确性反查，最终优化代理完成 AI-ready 文档与编码规范/抽象边界核对。实现代理未归档或提交；协调者按用户已授予的验收后独立归档、提交授权收尾。
