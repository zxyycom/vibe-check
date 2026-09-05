# Design

本设计把 Node 定位为唯一执行后端和产品宿主，把 Bun 降为可选且不拥有语义的 package-script launcher，并在进入 Plan 前闭合 Test Evidence 与发布验收方案。

本文是后续 Decision 演进与 Change Plan 编制的输入：先从术语表恢复宿主边界，再按带状态的 Intended Change 判断哪些方向已确认、哪些仍需证据。链接的稳定 owner 拥有当前规则，活动 Decision 拥有跨 Change 方向；本 Draft 不覆盖它们，也不授权实施。

## Context

**当前 owner 与长期基线**

[`package.json`](../../package.json) 当前声明 pnpm package manager 和 Node `>=24 <25` repository engine，但全部根 scripts 仍以 `bun` 启动 TypeScript entry；[`mise.toml`](../../mise.toml) 同时锁定 Node 24、Bun 1.3.14 与 pnpm。Product 正式入口仍是 [`src/index.ts`](../../src/index.ts) 的程序化 API，package 不发布 CLI 或 `bin`。

活动且已对齐的 [`support-bun-as-the-package-host.md`](../../docs/decisions/support-bun-as-the-package-host.md) 明确要求未来 Node host 使用独立 Decision 和 Change；[`make-bun-entries-use-pinned-tools.md`](../../docs/decisions/make-bun-entries-use-pinned-tools.md)、[`publish-readable-esm-package-layout.md`](../../docs/decisions/publish-readable-esm-package-layout.md) 与 [`separate-test-evidence-closure-from-execution.md`](../../docs/decisions/separate-test-evidence-closure-from-execution.md) 也分别把 Bun 写入仓库 entry、package consumer 和测试注册证据。它们是进入实施前必须显式演进的长期基线，不因本 Draft 存在而自动失效。

**已取得的 Linux 证据**

- `src/**` production modules 没有直接使用 `Bun.*` 或 `bun:` API；锁定的 Node 24.18.0 可以直接加载 source public entry。
- 当前 Bun-built exact candidate 在 Node 24.18.0 下完成了代表性的八 Check installed-runtime fixture，并产生预期 machine v4 evidence。
- 233 项 Product tests 在 Bun 下全部通过；Node 下的 35 项失败都来自 `node:assert/strict` 区分 null-prototype facts 与普通 expected objects，而当前架构本来就要求相关 facts 使用 null prototype。
- Package artifact、candidate install、dependency semver、release receipt、Gate performance baseline 和 Test Evidence 仍有显式 Bun runtime facts。当前 Case materials 中存在 367 个 `bun|...` runner references。
- Node registration-only JUnit 实验只报告文件 wrapper，不能直接复现当前 Bun JUnit 提供的嵌套 suite/test identity；Test Evidence 不能只做 runner 名称替换。

上述结果只证明迁移可行，不证明 Node package contract、pnpm isolated install 或 Windows sandbox 已经通过正式验收。

**术语与边界**

| 术语 | 本 Change 中的精确含义 | 是否进入正式依赖与验收 |
| --- | --- | --- |
| Node execution backend | 直接解析或加载 TypeScript/ESM entry，并执行 Product、script、test、Gate、build 与 release work 的进程 | 是；唯一必需后端 |
| Node product host | 直接 import 已发布 package 并调用程序化 API 的受支持消费者 runtime | 是；唯一承诺宿主 |
| Canonical launcher | 文档、自动化和 Gate 使用的 `pnpm run <script>`、直接 `node` 或受控 `pnpm exec` 入口 | 是；必须在无 Bun 环境通过 |
| Optional Bun launcher | 调用者自行安装的 Bun 只解析 `bun run <script>`，随后由 script body 启动 Node | 否；不拥有宿主、工具或验收语义 |

用户已确认 Bun 可以继续充当前端启动器。该确认只对应表中的 Optional Bun launcher，不扩大 Node product host contract，也不要求项目安装、pin、探测或回退到 Bun。

## Goals / Non-Goals

**Goals**

- 让公开 package 只承诺经 exact-candidate 验收的 Node host，并保持现有程序化 API 与可读 ESM 模块树。
- 让仓库 root scripts、environment bootstrap、Project Gate、test execution、candidate build/install 与 release workflow 的实际后端统一为锁定 Node 与 pnpm。
- 允许现有 Bun 安装作为可选 package-script launcher，而不让它拥有脚本语义、版本 pin、工具绑定或验证责任。
- 在不削弱 semantic Case 闭合的前提下，为 Node test runner 建立可恢复且稳定的测试实体 identity。
- 在目标 Windows sandbox 中证明标准自举、最窄测试、exact candidate consumer 和 required Gate 可用。

**Non-Goals**

- 不承诺 Bun 直接 import package、执行 Product callbacks 或作为第二个受支持 product host。
- 不增加 CJS、`require`、browser、CLI、`bin` 或第二套 package runtime layout。
- 不借迁移改变 Check 语义、四态结果、null-prototype facts、scanner policy 或公开 API 名称。
- 不用 Jest、Vitest 或其它测试框架替换 `node:test`，除非后续证据证明 Node 原生能力无法满足既有 Test Evidence contract 且单独获得设计确认。
- 本 Draft 不授权运行时实现、Decision 生命周期维护、Case 改写、发布或 Change 归档。

## Decisions

### Intended Change

1. **[已确认] 唯一后端与产品宿主为 Node。** Product package manifest、repository entry、child invocation、candidate fingerprint、release receipt 和 external consumer evidence 都以受支持的 Node 版本为宿主事实。
2. **[已确认] Bun 只可选触发 scripts。** 根 `package.json` 的每个正式 script 直接调用 `node`、`pnpm exec` 或显式项目工具。调用者可用 `pnpm run <script>`，也可在自行安装 Bun 后用 `bun run <script>`；两种 launcher 最终进入同一 Node-owned entry，项目不安装、pin、探测或回退到 Bun。
3. **[暂定方案] pnpm 承接 package-manager work。** 依赖命令、tool executable selection、candidate pack 与 isolated install 使用项目已锁定的 pnpm 或受控 Node entry，保留 no-ambient-fallback、exact tarball、dependency containment 和 ignore-scripts 边界。精确命令与 store containment 仍需实验闭合。
4. **[保持既有边界] ESM 与程序化入口不变。** 继续逐模块生成可读 `.mjs` runtime、declarations、source maps 与 source materials，只公开 package root；不建立新的 consumer entry 或 runtime format。
5. **[Plan 前待闭合] 重新建立 Node Test Evidence。** Runner identity 从 Bun-owned identity 演进为 Node-owned identity；只有 registration、静态实体、实际 execution 与 Case closure 重新形成完整证据后，才能批量迁移 Case references。Node JUnit registration-only 的已知信息缺口不能由静态结果补造。
6. **[保持既有边界] null-prototype 产品契约不变。** Node strict assertion 暴露的 prototype 差异通过准确的 expected values 或专用 test helper 修复，并同时证明 prototype 与领域字段；不能把 Product facts 改回普通 object 来迁就旧断言。
7. **[Plan Readiness] 先演进长期决策。** 为 Node-only host、Node-owned repository entries 与 Node Test Evidence 建立完整 Decision candidate/successor 方案，并处理全部直接冲突的 active decisions；Change stage 或任务完成不替代 Decision lifecycle 操作。
8. **[Plan 前待闭合] Node 支持范围。** 当前锁定的 Node 24.18.0 只作为迁移实验基线；最低 patch、major upper bound 与 Windows platform premise 由 dependency、exact-candidate 和目标 sandbox evidence 共同确定。

### Resulting Impacts

| 来源 | 受影响 owner | 实现 Outcome 必须形成的结果与证据 |
| --- | --- | --- |
| 1、4、8 | Product/package contract | `engines`、README、host diagnostics、artifact manifest/audit、fingerprint、receipt、external consumer types/docs/runtime acceptance 与 release verification 投影同一 Node host 范围；Bun-built candidate smoke 不能替代 Node-built exact-candidate evidence |
| 1、2、3 | Repository tooling | 根 scripts、shebang/help/focused commands、mise tool list、process helpers、开发命令、docs generation、governance adapters 与 Project Gate 不执行 Bun；Scanner 继续使用 mise-owned absolute bindings并拒绝 ambient fallback |
| 1、3、8 | Package lifecycle | `runBun`、Bun pack/install/resolve、`Bun.semver` 与 Bun-version fingerprint 由 Node/pnpm-owned capability 替代；isolated install 重新证明无 ancestor fallback、store/symlink escape、lifecycle script execution 或 dependency drift |
| 5、6 | Tests 与 Test Evidence | Runner profile、discovery/report、Gate lanes、semantic Case identities 与 prototype-sensitive tests 形成 Node-owned evidence；修改测试或 Case 时使用 `test-evidence-review`，并在修改前后运行全树闭合与最窄测试 |
| 1、5、8 | Gate 与性能 | Gate names、transcript、runtime observation 与 performance baseline 使用 Node facts并重新测量；不得沿用 Bun baseline 或通过放宽门禁隐藏 runtime 偏移 |
| 1、2、7、8 | 文档与治理 | architecture、configuration、script tooling、testing、package consumer docs、AGENTS commands 与直接相关 Decisions 同步；`bun run` 只表述为 optional launcher，canonical reproducible commands 使用 Node/pnpm |
| 1、3、5、8 | 平台验收 | 除 Linux smoke 外，在目标 Windows sandbox 验证 Node/pnpm、mise、Git、scanners、路径、进程与信号；Node 迁移本身不证明所有外部工具已支持该 sandbox |
| 1—8 | 并行 Change 协调 | 收敛为 Plan 前，按 [`docs/governance/change-coordination.md`](../../docs/governance/change-coordination.md) 复核与 `upgrade-jscpd-duplicate-detection-to-5-1-1`、`upgrade-scc-file-metrics-to-v4`、`replace-lizard-with-typescript-function-analyzers`、`add-scheduler-performance-diagnostics` 的串行顺序和已落地主线事实 |

## Risks / Trade-offs

- 保留 `bun run` 入口体验容易被误解成 Bun 仍是受支持宿主。Canonical documentation、manifest 和 acceptance 必须持续区分 optional launcher 与 actual Node backend。
- Test Evidence 是唯一已确认的非机械迁移点。若为避免重新设计而删除 runtime registration facts，会削弱当前 Case closure；若为维持旧报告而再次执行全部测试，则可能破坏已建立的 Gate 分层与性能目标。
- pnpm 的 content-addressable store、symlink layout 与 isolated consumer dependency resolution不同于当前 Bun install；实现必须验证真实解析路径和 exact candidate identity，不能只比较命令退出状态。
- Node 与 Bun 对 assertion、process stream descriptors、test discovery、subprocess 和 signal 的细节不同。部分失败是测试 seam 差异，但仍需逐项判断属于产品 contract、测试证据还是 Node adapter。
- 当前多个 active Changes 共享 package、scanner 与 Gate owners。过早实施会产生 lockfile、Case、performance baseline 和文档冲突；等待全部相邻 Change 又可能延后 Windows 可用性，需要在 Plan 阶段选择最小可独立合入的顺序。

## Open Questions

1. **Node 支持范围：** 最低 Node 24 patch 和 major upper bound 是什么？答案决定 package `engines`、repository pin、fingerprint 与 acceptance matrix；当前只证明 24.18.0。
2. **Test Evidence data flow：** 如何在不重复完整 test execution 的情况下取得真实 nested suite/test registration identity？答案决定 runner report owner，以及是否需要聚合各 Gate lane 的 runtime facts。
3. **pnpm isolation：** candidate pack/install 的精确命令、store 隔离和 dependency containment 如何表达？答案必须保持 exact artifact、ignore-scripts 与 no-ancestor-fallback 证据。
4. **Optional Bun launcher 的保证等级：** 它只是不禁止的调用方式，还是需要非阻断 smoke？后一选择会重新引入 Bun 工具可用性，但不能把 Bun 变回标准环境前置。
5. **Windows acceptance：** 哪个可重复入口代表用户报告问题的 sandbox，哪些外部工具在其中可用？答案决定本 Change 的 platform 阻断项与需要拆出的独立 Change。
6. **合入顺序：** 本 Change 与三个 scanner 轨道 Changes及 scheduler performance diagnostics 如何串行？答案决定 Plan 基线、lockfile/Case owner 冲突和 baseline 重测时点。
