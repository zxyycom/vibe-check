# Tasks

任务先收敛 AST 与 Definition grammar，再统一 Run/change injection，随后迁移所有真实 consumers 与发布材料并以完整 Gate 退出。

## Readiness

- [x] 0.1 固定字符串唯一 leaf、builder 即正式 AST、无 shorthand/flag node/input 双层类型的边界。
- [x] 0.2 固定 change flag 仅在注入/保护前特殊、callback 观察 effective flags、Git-only source 无 kind 的边界。
- [x] 0.3 核对 Definition、Run、Gate、package、文档、Decision 与 Case owners及基线证据。

## Implementation

- [x] 1.1 收敛 Check API、builder、Definition parser/normalizer/fingerprint/evaluator 为单一字符串-leaf AST，删除旧 public grammar。
- [x] 1.2 删除 source kind，验证多种 Git revision，并让 change preparation 输出唯一 frozen effective flags。
- [x] 1.3 让 selection、prepare 与 execute 使用同一 effective `project.flags`，保持 evidence、reserved prefix 与 unavailable fallback 边界。
- [x] 1.4 迁移 Gate、package consumers、fixtures、inventory、公开/内部文档、changelog、Decisions 与 Semantic Cases。

## Verification

- [x] 2.1 运行 Definition/condition、Run context/change lifecycle、Git revision 与 Gate 最窄行为测试。
- [x] 2.2 运行 typecheck、lint、format、metrics、docs projection/validation、Test Evidence 与 package acceptance。
- [x] 2.3 由非实施代理只审正确性与行为影响，确认 Success Criteria 且不存在 compatibility 双读。
- [x] 2.4 完成 AI-ready 文档与代码规范优化，运行 `bun run check -- --all`，完成并归档 Change。
