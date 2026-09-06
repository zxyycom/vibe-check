# Proposal

本 Plan 只把 Vibe Check 的公开 Product package 迁移为纯 Node runtime；仓库脚本、测试基础设施和构建工具继续使用现有 Bun backend。

## Why

当前 package 把 Bun `>=1.3.14` 声明为唯一产品宿主，README、public JSDoc、generated manifest、release receipt 和 external-consumer runtime acceptance 都延续这一契约。大部分 Product 已使用标准 ESM 与 `node:*` API，但 function-metrics 仍直接依赖 Bun 提供的 Web Worker globals，因此普通 Node consumer 不能完整运行公开能力。

目标不是替换仓库的脚本解释器或测试 runner，而是消除**已发布 Product runtime** 对 Bun 的依赖：构建、pack、candidate install、Project Gate、Test Evidence 与治理命令仍可由现有 Bun tooling 执行，只要最终 artifact 能由受支持的 Node 进程独立 import 和运行。

## Outcome

完成后，`@zxyycom/vibe-check` 的 generated manifest 只声明 Node 宿主，普通 Node consumer 可以直接 import package root 并运行包含 Worker-backed function metrics 在内的公开 API；exact installed candidate 的 runtime acceptance 由真实 Node child 完成。仓库根 scripts、Bun test identity、Gate runner、package build/install implementation 与 mise 中的 Bun pin 不因本 Change 改变。

## Scope

### Intended Change

- 把公开 package 的唯一宿主从 Bun `>=1.3.14` 替换为 Node `>=24.18 <25`。
- 将 Product function-metrics Worker transport 从 Web Worker globals 改为 `node:worker_threads`。
- 让既有 exact-candidate external runtime fixture 由 mise 锁定的真实 Node child 执行，并投影 Node 版本证据。
- 同步 package manifest、release receipt、consumer documentation、稳定 package owner 与直接相关长期 Decisions。
- 保持仓库 scripts、Bun test runner/Test Evidence、Gate host、build/install tooling、performance baseline 与 mise Bun pin 不变。

### Resulting Impacts

Product Worker 的 message/error/exit/cancellation 结算需要按 Node API 重建并由相邻测试证明；package manifest/audit 与 portable receipt 必须从 `bunEngine` 原子迁移为 `nodeEngine`；external-consumer runtime 需要显式 Node executable binding，不能再使用 Bun parent 的 `process.execPath`；所有面向 package consumer 的说明必须把 Node 与仍由 Bun 执行的 repository commands 区分开。

## Success Criteria

1. Generated artifact 只声明 Node `>=24.18 <25`，release receipt 与 installed documentation 使用相同宿主事实，不再承诺 Bun Product host。
2. Product production source 不依赖 Bun/Web Worker globals；Node 24.18.0 exact installed consumer 成功执行包含 function metrics Worker 的代表性完整 Run。
3. Worker cancellation、invalid request/reply、post failure、error、无 message 退出和成功结果均保持 fail-closed 或既有语义，且不会重复结算。
4. Root scripts、Test Evidence profile/Case keys、Gate test lanes 和 performance runtime 仍为现有 Bun tooling；本 Change 不产生脚本后端迁移。
5. 最窄测试、Case 闭合、docs/Decision/Change 校验和完整 Project Gate 通过；独立审阅确认 Product/文档影响完整。

## Affected Owners

- `src/package-checks/function-metrics/**` 的 Worker transport 与相邻行为测试。
- `scripts/package/package-contract.ts`、`artifact/**`、`release/**` 与 `candidate/external-consumer/**` 的 package contract 和 acceptance。
- `README.md`、public JSDoc、package consumer guides、`docs/tooling/package-lifecycle.md` 与相关架构说明。
- 已归档的 Bun host/readable layout Decisions，以及当前 Node host/readable layout successor Decisions。
