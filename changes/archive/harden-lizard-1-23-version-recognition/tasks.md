# Tasks

Readiness 已以当前 owner 和运行证据审计完成；实施按 version barrier、证据同步、由窄到宽验证的顺序推进。

## Readiness

- [x] 0.1 在 Plan 形成时审计 adapter、public Check 与运行时基线：`availability.ts` 接受任意非空 output，`measureFunctionMetrics` 在 scan 前检查 availability，`mise exec -- lizard --version` 输出 canonical `1.23.0`，且 `bun run test-evidence -- check --root .` 通过。
- [x] 0.2 审计稳定边界：`docs/checks/function-metrics.md` 规定 Lizard 1.23-compatible version/CSV contract，active adapter-protocol decision 保持 version probe 私有，相邻 TypeScript port Plan 仍是独立后置 hard cut；因此采用 Product `1.23.x` range，而非 exact `1.23.0` public policy。

## Implementation

- [x] 1.1 在 `src/package-checks/function-metrics/lizard/availability.ts` 实现完整 canonical 三段 decimal parser（每段为 `0` 或不以 `0` 开头）与 `1.23.x` predicate；对不匹配或不支持 output 返回 `contract-error`，且 unrecognized raw output 不进入 diagnostic。
- [x] 1.2 在 Lizard adapter tests 证明 `1.23.0` 和 `1.23.1` 可用；证明缺少 patch、额外文本、leading-zero `1.23.00`/`01.23.0`、其它系列、任意文本和空 output 均为 contract error。更新现有 fake success fixtures，禁止其继续使用 noncanonical `lizard 1.23`。
- [x] 1.3 在 public function-metrics test 增加 unsupported-version executable：断言 owning Check unavailable、`unavailable: "fail"` aggregate failed、scan marker 缺失；保留并运行现有 accepted scan、zero-function、process/signal、malformed/partial CSV 与 exact-input tests。
- [x] 1.4 按目标 owner 同步 `function-metrics` guide、scanner-dependencies 和 Case `AUX-LIZARD-ADAPTER-OUTCOMES-001`：明确无 leading zero 的 accepted canonical range、wrapper exact-pin boundary、private ownership 与 no-scan evidence；不修改长期 port Plan 或决策。

## Verification

- [x] 2.1 修改测试前后运行 `bun run test-evidence -- check --root .`；审阅 Case mapping，确认新增/变更 assertions 仍由 `AUX-LIZARD-ADAPTER-OUTCOMES-001` 和 function-metrics owner 的独立可观察行为承接。
- [x] 2.2 运行 `bun test src/package-checks/function-metrics/lizard/scanner.test.ts`、`bun test src/package-checks/function-metrics/lizard/parser.test.ts`、`bun test src/package-checks/function-metrics/constructor.test.ts`、`mise exec -- lizard --version`，并用 `mise exec -- bun -e` 调用 `checkLizard`；证明 adapter fixtures 与真实固定 `1.23.0` availability baseline 都通过。
- [x] 2.3 运行 `bun run format`、`bun run typecheck`、`bun run lint`、`bun run validate -- docs` 与 `bun run verify:vibe-check-workspace:required`，证明局部工程、文档和 required workspace Gate 一致。
- [x] 2.4 仅通过公开入口 `bun run package:verify` 完成最终验证；确认它闭合 full candidate、installed external-consumer runtime acceptance 与 full Project Gate。
