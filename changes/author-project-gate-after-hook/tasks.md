# Tasks

任务先演进 owner 判断，再迁移动态模块契约和 Hook 配置，最后证明 candidate 顺序与唯一最终结果未被破坏。

## Readiness

- [ ] 0.1 使用 Decision Records 为 `centralize-project-gate-definition-and-separate-adapters.md` 建立后继，明确中央 Definition 拥有 `afterGate`，并复核 performance advisory Decision仍适用。
- [ ] 0.2 复核 `run.ts`、candidate preparation、`bound-run.ts`、Definition imports与现有 tests，固定“prepare → dynamic import → entry equality → Product Run → afterGate”的调用顺序。

## Implementation

- [ ] 1.1 在 `definition.ts` 声明具名同步/异步 `afterGate`，显式保留 performance observer，并让动态 bound module向 root adapter提供该函数。
- [ ] 1.2 调整 `run.ts` 和 tests，使正式 Hook只来自已验证动态 module，合法返回形成唯一最终 result，throw/非法返回继续 fail closed。
- [ ] 1.3 更新文档导航、Gate tooling owner与语义 Cases，明确 Hook的发现入口、执行时机、任意受信任代码权限以及与 Check `preflight`/测试 seam的区别。

## Verification

- [ ] 2.1 运行最窄 Gate adapter、bound module、performance observation tests及 Test Evidence closure，覆盖同步、异步、throw、非法返回和 entry mismatch零调用。
- [ ] 2.2 运行 typecheck、lint、format与 docs validation，审查实现符合编码规范且没有 Hook registry或第二配置面。
- [ ] 2.3 运行 `bun run verify:vibe-check-workspace:required`，证明 exact candidate、默认 performance advisory、transcript与 exit mapping完整通过。
