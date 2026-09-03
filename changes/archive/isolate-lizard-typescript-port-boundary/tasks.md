# Tasks

任务按 Readiness、边界实施、evidence/profile 收口和验证顺序执行；checkbox 只在对应产物或命令证据存在后勾选。

## Readiness
- [x] 0.1 使用 `decision-records` 恢复相关长期方向，并建立 active+unaligned `isolate-lizard-port-behind-check-private-interface.md`；它只保存本 Change 之外仍有效的边界方向。
- [x] 0.2 `readiness-boundary-audit.md` 确认 façade root requirement、Product adapter 路径、Worker compiler-root/public export 不变、path-classified test policy、stable-doc/Case owner 以及 `analyzer/**` 无收益改名不在范围内；本次 Readiness synthesis 据此选择最小 façade leaf `analyzer/port-facade.ts`（非根 `index.ts` 不可用）。
- [x] 0.3 已由 `readiness-boundary-audit.md` 完成按路径 import/data-flow 审计：唯一目标调用链、port-root deep-import allowlist、port 外 adapter-only test policy、两个 production deep importers，以及三个 archive-reading test files/五份连续输入的 baseline 均已记录。
- [x] 0.4 已由 `readiness-evidence-audit.md` 确定 current evidence subtree 为 `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/evidence/`；`licenses/lizard-1.23.0-provenance.json` 是唯一 source/range/SPDX/target mapping，archive 不可修改，三个测试消费者迁移后需闭合 42 source/range、37 targets、81 classes、792 mappings 且无 package payload impact。
- [x] 0.5 已由 `readiness-quality-audit.md` 采集 lint、format、typecheck 与 required Gate 基线，并收口双层质量规则：lint/format/typecheck 零 translated-only 例外；Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 仅有 `definition.ts` 精确硬编码的 14 distinct provenance-qualified paths/20 rule-path instances。配置测试以 root provenance/header fail-closed 验证硬编码 selection；普通 coverage、手写 façade/非翻译 Product/所有 tests 的适用检查必须保留。

## Implementation
- [x] 1.1 已在 `analyzer/**` 建立唯一 `port-facade.ts` production entry，收口大小写无关 suffix capability 与 caller-supplied Lizard-domain in-memory analysis；Product-only registry alias 已移除，translated internal spellings/structure 保留。
- [x] 1.2 已建立 port 外的 `src/package-checks/function-metrics/analyzer-adapter.ts`，它是 façade 的唯一 production consumer，并独占 Product support/error interpretation 与 Lizard-domain result → `FunctionMetric` mapping。
- [x] 1.3 target-files、measurement、Worker 与私有 contract 已遵循 measurement → Worker → adapter → façade 调用链；path admission、case-insensitive suffix、failure/cancellation/resource 与 no-partial semantics 保持。
- [x] 1.4 已扩展按路径扫描 production/tests 的 fail-closed dependency/layout validation，证明唯一 façade/adapter consumer、禁止 Product deep import、受控 port-root fidelity/unit test 深导入与不泄漏 public surface。
- [x] 1.5 已将 current identity/oracle/deviation evidence 迁至 `analyzer/fixtures/lizard-1.23.0/evidence/`，三个消费者不再读取 archive；root `licenses/lizard-1.23.0-provenance.json` 是唯一 mapping，identity test 闭合全部 42 source/range、37 translated targets（含 protocol `additionalTargetPaths`）、81 classes 与 792 mappings，并保持 legal inventory、source headers 和 package closure。
- [x] 1.6 lint、format、typecheck 保持零 translated-only 例外；`scripts/project/gate/definition.ts` 已为 `duplicateDetection`、`fileMetrics`、`functionMetrics` 精确硬编码 14-path/20-instance Gate ledger。configuration test 读取 root provenance 并校验每个排除 target 的 source header，以 fail-closed 方式验证硬编码 policy，`extensions/protocol.ts`、手写 façade、adapter、Worker、Check、tests 和其它非翻译 Product 仍受各适用普通检查覆盖。
- [x] 1.7 已更新 stable docs 与 native Cases，说明实际 private boundary、current evidence owner、quality profile、upstream-sync procedure 和 package-private status；稳定 owner 不依赖 Change/archive。

## Verification
- [x] 2.1 `bun test` façade/adapter/target-files/measurement/Worker/layout：7 文件 12 passed，调用链、admission、Worker 失败/取消与 import/layout policy 均通过。
- [x] 2.2 `bun test src/package-checks/function-metrics/analyzer`：24 文件 73 passed；identity/oracle/deviation/readers/shared 覆盖 42/37/81/792 closure，`rg 'changes/archive/' src` 零匹配。
- [x] 2.3 Gate definition/repository-quality tests：2 文件 6 passed（14 paths/20 instances、provenance/header fail-closed 与保留覆盖）；`bun run lint -- product`、`format -- check`、`typecheck` 均通过。
- [x] 2.4 `bun run test-evidence -- check --root .` 通过：448 current Bun entities，111 Cases，15 Topics。
- [x] 2.5 `decisions -- check`、`validate`、`package:build`、artifact/candidate/public-API/external-consumer tests 与 Change check 均通过；`package:verify` 等同 full Gate，按范围未运行。
- [x] 2.6 依次运行 `bun run verify:vibe-check-workspace:required`（36 checks：30 passed、0 failed；3 not-applicable/3 unavailable 为未启用 package-tests 的依赖链）和 `bun run verify:vibe-check-workspace:full`（36/36 passed、0 failed）；quality 的 11 file-metrics、15 duplicate-detection、19 function-metrics findings 均为 Gate 明示不参与 aggregate 的非阻断 advisory。full 覆盖 prepared candidate、artifact/lifecycle、external-consumer runtime/documentation/type acceptance。invocation evidence：`.log/project-gate/2026-09-02T18-37-43.407Z-3196754-93921ebb-5657-4362-b773-01edb5de2bed`（required）与 `.log/project-gate/2026-09-02T18-38-01.358Z-3200619-d1bd8ce7-cfc7-4e74-84aa-64b23c38d9db`（full）；无环境阻塞或未覆盖边界。
