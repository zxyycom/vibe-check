# Tasks

任务先扩展唯一 authoring grammar 与 builder，再接入真实 Gate consumer和随包材料，最后以兼容性、package 与完整 Gate 证据退出。

## Readiness

- [x] 0.1 固定字符串 atom、直接导出函数、无 `flag()`/namespace、`changeFlag` 返回字符串的公开边界。
- [x] 0.2 核对 Check API、Definition、Gate、文档、package acceptance 与 Case owners。

## Implementation

- [x] 1.1 实现多态 authoring type、六个 builder、`changeFlag` 与递归字符串 normalization。
- [x] 1.2 同步 root exports、JSDoc、public inventory、external type/runtime acceptance。
- [x] 1.3 将 Gate 与公开 API example 切换到 builder-first 形式，保留 raw AST compatibility tests。
- [x] 1.4 同步公开/内部 owner 文档、changelog 与 Semantic Cases。

## Verification

- [x] 2.1 运行 builder、Definition normalization/fingerprint、selection 与 Gate 最窄测试。
- [x] 2.2 运行 typecheck、lint、docs projection/validation、package acceptance 与 Test Evidence check。
- [x] 2.3 由非实施代理只审正确性，确认所有 Success Criteria 与兼容边界。
- [x] 2.4 运行 `bun run check -- --all`，完成 Change 并归档提交。
