# Design

本设计把“转 Node”严格限定为 Product/package host 迁移，并让现有 Bun-owned repository tooling 负责构建和验证 Node 可运行的发布产物。

## Context

Product 的正式入口是 [`src/index.ts`](../../src/index.ts) 提供的程序化 API，package 不提供 CLI 或 `bin`。仓库根 scripts、Project Gate、Test Evidence、candidate build/install 和 governance adapters 当前均由 Bun 执行；这些是开发与交付 tooling，不是 package consumer runtime，本 Change 不迁移它们。

当前 generated package manifest 声明 Bun `>=1.3.14`，README 与 public JSDoc 也只承诺 Bun。可读 ESM artifact 大部分使用标准 ESM 和 `node:*` API，但 [`measurement.ts`](../../src/package-checks/function-metrics/measurement.ts) 与 [`analyzer-worker.ts`](../../src/package-checks/function-metrics/analyzer-worker.ts) 依赖 `Worker`、`self` 和 `postMessage` Web Worker globals；mise 锁定的 Node 24.18.0 没有 global `Worker`，因此仅证明 package root 可 import 并不能证明完整 Product 可用。

现有 external-consumer runtime fixture 已从 exact installed candidate 覆盖 duplicate detection、function metrics Worker、JSON Schema、Markdown links、cache、machine publication、自定义 Check 和 Project Run。它目前由 `process.execPath` 启动，而该值在 Bun-owned test process 中仍指向 Bun；把这个**consumer child**显式绑定到锁定 Node，即可保留现有 Bun Gate，同时形成真实 Node Product evidence。

新建立的 [`support-node-as-the-package-host.md`](../../docs/decisions/support-node-as-the-package-host.md) 已替代 Bun-only host 方向；[`publish-node-readable-esm-package-layout.md`](../../docs/decisions/publish-node-readable-esm-package-layout.md) 同时将物理布局改为 Node consumer contract。这两个 successor 在完成实施与验收前保持 unaligned，并已在证据闭合后标记为 aligned；repository entry、Test Evidence runner 和 package-manager Decisions 不受影响。

用户已明确代码按跨平台 Node API 实现，不把 Windows 环境或预防性平台分支设为本 Change 前置；未来出现可复现的平台 Bug 时另行修复。

## Goals / Non-Goals

**Goals**

- 让公开 package 以 Node `>=24.18 <25` 为唯一承诺宿主，并保持现有程序化 root export 与可读 ESM 布局。
- 将 Product 的 Worker transport 改为 Node `node:worker_threads`，保持一次性请求、取消、失败闭合、完整批次和 shipped Worker URL 语义。
- 让 exact installed-candidate runtime fixture 在真实的锁定 Node 24.18.0 child 中执行，覆盖 Worker-backed 与其它代表性公开能力。
- 同步 generated manifest/audit、formal receipt、README、public JSDoc、package guides 和直接相关 product-host Decisions。

**Non-Goals**

- 不把 root package scripts、environment、development commands、Project Gate、Test Evidence、governance adapters 或 package build/install tooling 从 Bun 迁移到 Node/pnpm。
- 不更改 Bun test entity identity、Case keys、Gate test lanes、Gate performance runtime、canonical `bun run` commands、mise Bun pin 或 Bun-owned artifact fingerprint。
- 不承诺 Product 同时支持 Bun；迁移后的公开 contract 是 Node-only，即使部分调用在 Bun 中偶然可用也不构成兼容保证。
- 不增加 CJS、`require`、browser、CLI、`bin` 或新的 public subpath。
- 不改变 Check 语义、四态结果、null-prototype facts、machine schema、scanner policy 或公开 API 名称。
- 不建立 Windows 专用 code path、CI matrix 或完成门禁；真实平台缺陷出现后按复现证据处理。

## Decisions

### Intended Change

1. **Node-only Product host。** Generated package manifest 从 Bun engine 切换为 Node `>=24.18 <25`；README、public JSDoc、package guides 与 formal release receipt 使用同一范围。仓库自身继续锁定 Node 24.18.0 作为 consumer acceptance runtime。
2. **Node-owned Worker transport。** Product 直接使用 `node:worker_threads` 的 `Worker` 与 `parentPort`，不建立 Bun/Node runtime adapter 或双宿主分支。Parent 对首个 `message` 结算成功，对 `error`、non-zero `exit` 或未收到 message 的 zero exit 结算完整分析失败；abort 先解除 listeners、终止 Worker 并只结算一次。Worker 只接受既有 closed request，发送一次既有 response 后关闭 port。
3. **Bun tooling 构建 Node artifact。** `runBun`、Bun pack/install、`Bun.semver`、Test Evidence profile 和 Gate process host 保持原状；artifact 是否纯 Node 由 generated contract、静态 audit 和显式 Node external-consumer execution 证明，而不是由构建脚本宿主推断。
4. **只切换 consumer execution seam。** External-consumer material 仍由既有 candidate lifecycle 准备，types/docs/runtime acceptance 的编排仍属于 Bun tooling。`mise.toml` 为 acceptance adapter 投影锁定 Node 的绝对 executable path；所有实际 import 并调用 installed package 的 documentation/runtime fixture 及其 dependency executable child 使用该 command，并验证 runtime fixture 观察到的版本落在公开范围内。声明 typecheck 仍使用 repository-pinned `tsgo`，不构成 Product runtime。
5. **直接演进两个 product Decisions。** 建立 Node-only package-host successor，并让 readable ESM layout 改为 Node consumer contract；不演进 repository-entry、Test Evidence 或 package-manager Decisions。

### Resulting Impacts

| Intended Change | 受影响 owner | 必须处理的结果与证据 |
| --- | --- | --- |
| 1、5 | Package contract / Decisions | `PACKAGE_*_ENGINE`、generated manifest/audit、formal receipt schema/verification 与 product-host Decision 统一为 Node；旧 Bun host Decision 按演进关系归档。 |
| 1、4 | Package consumer documentation | README、public `run` JSDoc、package guides 和 installed declaration audit 只描述 Node host，不把 Bun repository commands 误写成 Product requirement。 |
| 2 | Function metrics Product | `measurement.ts`、Worker entry 和相邻测试迁移到 `node:worker_threads`，保留 cancellation、malformed reply、post failure、worker failure 与完整结果边界。 |
| 3、4 | Artifact / external consumer acceptance | Bun 继续 build/install exact candidate；Node child 从 installed root 运行现有代表性 fixture 并证明实际 `process.version` 与 Worker path，避免把 Bun parent 成功当成 Node evidence。 |
| 2、4 | Test evidence | 只修改受影响 Product/acceptance 测试正文及其 Case `Proves`（如需）；runner identity 仍为 `bun|...`，闭合机制不迁移。 |
| 1—5 | Stable docs | Package lifecycle 与架构文档区分 Bun-owned repository tooling 和 Node-only shipped Product，canonical repository commands 保持不变。 |

## Risks / Trade-offs

- `node:worker_threads` 与 Web Worker 的 event/error/exit API 不同；若只替换 constructor 而不重建 settlement，Worker 崩溃可能悬挂或产生重复终态。
- Bun 运行 Product unit tests 时对 `node:worker_threads` 的兼容实现不能替代 Node consumer evidence；反过来，只做一次 Node import 也不能覆盖 Worker 和 dependency execution，因此必须保留代表性 installed runtime fixture。
- 构建工具仍依赖 Bun，意味着贡献者和发布者仍需 Bun；这与“Product consumer 纯 Node”不冲突，但文档必须清楚区分 consumer prerequisite 与 repository prerequisite。
- Node-only 是宿主替换而非 dual runtime。继续为 Bun Product 行为增加兼容层会扩大本 Change 范围并削弱“纯 Node”边界。

## Open Questions

无。Product 与 scripts 的边界、Node host range、Worker settlement、acceptance executable binding 和平台验收范围均已闭合。
