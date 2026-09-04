# Design

以唯一真实 package preparation、快速 contract evidence 和批量 consumer runner 代替 routine full 中的重复重工作，同时把质量扫描差异限定在 Function metrics。

## Context

Gate root 在 Product Run 前准备或复用当前源码指纹的 exact local candidate；stale candidate 的 build/install 失败会直接阻止 Gate 启动。Artifact acceptance 已消费该 prepared candidate，不会在 full 中 direct-build；external types/docs/runtime 也已共享一次 provider installation。调查报告分别记录 candidate 至少 24 个 Bun child、Function metrics timer-yield 放大和 documentation 至少 12 个总 Bun starts；唯一一次 full 验收又以 6.1 秒 types consumer 证明 `tsgo` 后的第二个 LanguageService program 仍是可移除的 analyzer 重复。

## Goals / Non-Goals

目标是删除没有独立证明增量的 compile/install/process work，使 routine Check 在普通目标负载下低于 5 秒，并保留 exact artifact、发布材料、private dependency、consumer 行为和失败分支证明。非目标是改变 root 并发、放宽 timeout、移除 artifact acceptance、合并 types/docs/runtime Check、改变公共 Package API、优化 analyzer 算法或让所有测试代码退出 duplicate/file maintainability policy。

## Decisions

### Intended Change

1. 把 `candidate.test.ts` 保留为快速 contract surface，并归入既有 package-supporting lane；将真实 cold lifecycle cases 移入非默认发现的显式 integration target。原 package-candidate Gate identity 不再具有独立 terminal 意义，因此删除而不保留空壳。
2. 显式 integration target 继续直接调用真实 `preparePackageCandidate`，保存冷构建硬预算，并通过新的 root package command 可发现地运行；它不进入 supported routine runner profile。
3. Function metrics 的 production chunk yield 保持 timer；resource boundary tests 通过私有参数使用立即 yield，独立 cancellation test 继续使用默认 timer 和真实 Worker boundary。
4. Function metrics repository policy 只排除 Product test/test-support globs；duplicate/file policy 保留原 scope 并由配置测试证明差异。
5. Documentation consumer 启动一个 Bun `-e` runner，按确定顺序动态 import 所有 runtime example，再运行 machine Definition assertions；runner 在错误中携带当前相对 example identity。
6. Types consumer 继续让 `tsgo` typecheck 完整 public imports、runtime examples 和 machine Definition；JSDoc acceptance 直接从 installed declaration owners 提取相邻注释并核对既有 summary/tag 内容，不再加载 TypeScript LanguageService。

### Resulting Impacts

- Test Evidence 的 supported profile 只发现 routine `.test.ts`；显式 integration target 采用不同 basename，并由 package command/文档拥有，不伪装为 Case entity。原 Candidate Case 同时说明 routine contract 证据与显式 integration 的验证边界。
- Package candidate Gate Check 被删除；快速 contract 进入 package-supporting lane。Prepared candidate、artifact 和 external provider 继续形成真实物理链，external provider 仍独占 lifecycle mutex。
- Candidate lifecycle 后继 Decision 已完整保留 external provider typed data、单次安装、三个 consumer 独立 Check、cleanup 和 artifact acceptance，只修订 detached candidate lifecycle 部分。
- Function metrics scope Decision 只改变 complexity/density Finding，不改变 duplicate fragments、file-length Findings、lint、typecheck 或行为测试。
- 单 runner documentation execution 共享 process globals 和 module cache；runner 必须顺序执行并使用唯一 fixture paths，测试需要证明所有 source identity 被执行和错误定位不丢失。
- Types consumer 仍由真实 compiler 证明 declaration resolution 与 authoring，direct declaration audit 只替代重复的 hover program；Case 必须明确该证明边界。

## Risks / Trade-offs

- Routine full 不再每次强制 cold-build test fixture；真实 builder 由 stale root preparation 和显式 integration target 证明。若 integration command 不可发现或不阻断，会形成覆盖缺口，因此必须进入 root command 文档和 package-tooling verification。
- 原 candidate lane 已删除，快速 contract 已并入 package-supporting；最终使用最少稳定 identity，不为保留旧 lane 制造空壳。
- Function metrics test seam 若可被 production caller 配置会削弱 cooperative cancellation；它必须与领域输入分离，保持模块私有，并让 production 只使用 timer 默认值。
- 排除 Product tests 会移除其函数复杂度 Finding；这是有意取舍，duplicate/file 仍负责对使用体验影响最大的重复和文件长度。
- Documentation examples 在同进程中可能互相污染；若目标测试证明有全局状态泄漏，则改用一个 supervisor process 内的隔离 Worker，而不是恢复十一个 Bun process。
- Direct declaration audit 不声明 editor QuickInfo 展示行为；它只证明 installed JSDoc bytes，而 `tsgo` 继续证明同一 installed graph 的 consumer types。若将来需要 editor 特定协议，应由独立低频 integration target 承接。

## Open Questions

无。用户已确认 routine full 可不运行重复 package build test，并授权对其它低影响慢点自行调整；质量策略明确采用“Function metrics 排除测试、duplicate/file 保留测试”。

## Implementation Observations

- Candidate routine contract 为 0.317 秒，package-supporting 完整 lane 为 0.908 秒；显式 cold physical integration 的审计后目标运行耗时 8.15 秒，先前两次为 19.27 秒与 11.07 秒，均保留 20 秒 case / 30 秒 target 硬限制。
- Function metrics resource suite 为 0.629 秒，32 文件 / 96 测试完整 lane 为 2.108 秒。
- 唯一一次 full 验收发生在 types 后续调整前，通过 36/36；Product Run wall 为 16.0 秒，candidate lifecycle Check 已移除，Function metrics 为 2.3 秒、documentation consumer 为 1.8 秒，types consumer 是唯一超过 5 秒的 Check（6.1 秒）。
- 删除第二个 LanguageService program 后，同一 exact external material 上 types acceptance 区段为 3.441 秒；编码规范审计修正后的正式目标 test 为 4.172 秒、总 wall 为 4.47 秒。依用户的全量测试约束未再运行第二次 full；当前 types 改动由该目标测试、scripts typecheck/lint 和最终治理检查覆盖。
