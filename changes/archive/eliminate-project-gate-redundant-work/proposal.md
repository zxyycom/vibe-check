# Proposal

让 full Project Gate 只执行一次真实 package preparation，并消除其它慢 Check 中已确认的重复进程和测试调度开销。

## Why

目标级调查确认 `tests-package-candidate` 在 Gate root 已准备 exact candidate 后，又以 detached fixture 重复 cold compile、pack 和多次 install；Function metrics 的两个资源边界测试把约 3 秒花在数千次 timer yield；external documentation acceptance 为十个例子和一个 Definition 启动十一个 child runner。唯一一次 full 验收还确认 types consumer 在真实 `tsgo` 后为 JSDoc/QuickInfo 构造第二个 TypeScript program，使该 Check 在竞争下达到 6.1 秒。这些工作使普通 Check 越过 5 秒，却没有同比增加独立验收价值。

## Outcome

full Gate 不再执行 detached package rebuild/install 测试，artifact 与 consumer acceptance 复用同一次 exact candidate；Function metrics 测试和 documentation acceptance 消除已确认的调度与进程扇出，并让普通目标级 Check 保持在 5 秒以内且不减少必要证明。

## Scope

### Intended Change

- 将 candidate 的真实 build/install 唯一归于 Gate root preparation；full 中保留快速 lifecycle contract 与 exact artifact/consumer acceptance，不再执行 detached cold integration。
- 为 Function metrics source admission 提供私有 test-yield seam；资源边界仍读取真实 8/64 MiB 字节，生产让步和独立 cancellation integration 保持不变。
- 仅从 repository Function metrics 的 Product scope 排除 `*.test.ts` / `*.test-support.ts`；duplicate detection 与 file metrics 继续覆盖测试代码。
- 将 external documentation 的十个 runtime examples 与 machine Definition 放入一个 consumer-owned Bun runner，并保留逐输入失败定位。
- External types consumer 保留一次真实 `tsgo` typecheck，改为直接核对 installed declaration JSDoc，不再构造第二个 LanguageService program。

### Resulting Impacts

- Candidate test 文件、Gate lane、supported Test Evidence surface、semantic Case 和 package tooling 文档需要重新划分；真实 cold integration 仍以显式 package-tooling target 和原硬预算保留，但不属于 routine full。
- 既有“candidate lifecycle 继续在 test-local state 中 cold preparation”的 active Decision 需要由后继修订；Function metrics 的测试源码质量范围需要独立长期决策。
- Function metrics resource test 正文、repository-quality selection tests、documentation consumer tests 与对应 Cases 都需要同步。
- Types consumer 的 declaration-documentation 证明方式与 Public authoring Case 需要同步，但 public typecheck input 和 package surface 不变。
- Gate root `maxParallel: 3`、20/30 秒既有数值、artifact/consumer material audit、external provider 单次安装及 required/full 的其它 assurance 不变。

## Success Criteria

- 删除不再具有独立 terminal 意义的 `tests-package-candidate` Gate identity；`candidate.test.ts` 只保留在 package-supporting lane 中运行的快速 contract，目标级运行低于 5 秒。
- 显式 cold package integration 继续验证 rebuild/install/reuse/reinstall 和 ancestor-fallback，保持 20 秒主 case 与 30 秒 target 边界，且失败阻断该显式命令。
- Function metrics exact lane 的普通目标级样本低于 5 秒；8/64 MiB、生产 cancellation、Worker failure 和 exact-input 行为继续通过。
- Documentation acceptance 从十一个 example/Definition child runners 收敛为一个，并保持所有 examples、machine output 和失败路径证据。
- External types target 在保留真实 public consumer typecheck 与 installed JSDoc 内容证明后低于 5 秒。
- Repository Function metrics 不再选择 Product test/test-support；duplicate detection 与 file metrics 仍明确选择代表性 Product tests。
- 目标测试、Test Evidence、Decision/Change/Investigation 检查、scripts/product typecheck/lint、文档验证通过；完成后最多运行一次 full Gate。

## Affected Owners

- `docs/script-tooling.md` 与 `scripts/package/**`、`scripts/project/gate/**`
- `docs/testing.md`、`docs/testing/case-maintenance.md`、`docs/testing/cases/**` 与 `scripts/test-evidence/**`
- `src/package-checks/function-metrics/**` 与 repository-quality Gate policy
- `docs/decisions/**`、`docs/investigations/**` 和本 Change
