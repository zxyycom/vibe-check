# Proposal

本 Change 在 `adopt-typescript-project-definition` 完整交付 current public-contract source 与 package-private runtime seam 后，建立 Vibe Check 的 API-only npm 产品边界：首个 package 只支持 Bun，公开 API 恰好包含配置定义与工具运行两个操作，并在同一实施边界 hard cut 当前 Product CLI。

**执行门禁：** 本 Change 当前没有可执行任务。`adopt-typescript-project-definition` 完成并归档后，依次执行 Readiness `0.15`、`0.16` 并刷新 baseline，才从 `1.1` 连续实施。本 Change 不与前置 Change 交替推进。

## Why

当前产品事实仍是 `src/product/**` 拥有的 Bun CLI，正式入口依赖 argv、console 和 exit code；root `package.json` 也是 `private: true` 的 workspace manifest，不能证明可安装 API 的 runtime、声明和依赖闭合。Package 消费者需要把 Vibe Check 直接组合进自己的工具、服务、编辑器或 agent，并从结构化结果恢复执行事实。

Vibe Check 仍是有日志、缓存、输出和运行时依赖的配置驱动工具。API-first 只改变正式集成边界，不把产品改成无副作用的纯函数，也不要求调用方实现 environment、filesystem、Git、process、thread 或 worker 等低层能力。

当前正式宿主还通过 repository-owned mise/pnpm 环境提供 `scc`、Lizard 与 jscpd。Exact-tarball consumer 不拥有这些开发环境，因此首个 package 必须把每项 scanner implementation 闭合为 package production material，或声明为由配置显式绑定的外部程序；只运行 dependency audit 不能替代这个消费者契约。

`adopt-typescript-project-definition` 的实施范围包括 Project Definition authoring、selection、private loading/normalization、JSON hard cut、foundation handoff，以及唯一 current public-contract source 的 definition-facing fields。该 Change 完成并归档后，本 Change 才开始 package integration：消费既有 source 与 runtime seam，补全 package/release fields、public entry、package projection、Product CLI hard cut 与 exact-tarball acceptance；不重复实现 loader、名称 owner 或配置迁移。

Vibe Check 继续作为产品显示名，公开 registry package 使用 unscoped `vibe-check`，以 MIT 许可正常发布。Public exports/symbols、固定 Project Definition 路径和运行标识由 current public-contract source 承接，不能从 root manifest、源码、Change 名称或示例偶然继承；本 Change 只验证、消费并按实际 package/release evidence 扩展该 owner。

## Outcome

Repository root 保持 private。受控 build 从权威 Product source 和唯一 current public-contract source 生成 package staging tree；candidate manifest 不含 `bin`，公开 callable surface 恰好包含：

1. 在使用者拥有的 TypeScript Project Definition 文件中调用的配置定义操作；
2. 加载该 definition 并运行完整工具的工具运行操作。

支撑这两个操作的公共类型属于同一契约，不形成第三项操作。Product 提供 Bun default runtime，通过已交付的 package-private runtime seam 加载 Project Definition 和 custom runner；普通 invocation 默认产生受控日志/progress、适用缓存和 canonical output，同时返回结构化领域结果、diagnostics、decision 与 effect status。

首个 package 的产品边界已经确定：unscoped `vibe-check`、public npm distribution、MIT、`0.0.x` prestable、Bun-only direct import、API-only execution，以及允许由配置显式提供 Python、`scc` 等外部程序位置。Check 的配置字段和产品语义保持 scanner-tool 中立；具体工具并不隐藏，运行依赖绑定也不改变 Check 的身份或含义。本 Change 在既有 current public-contract source 中补全 candidate version input、evidence-derived host matrix、package/release fields 与全部 package consumers；不重命名 Project Definition Change 已交付的 definition-facing contract。

Repository dogfood command 位于 `scripts/**`，只拥有自身 argv、console 和 exit mapping，并作为 package API consumer 调用 Vibe Check。发布流水线止于 deterministic build、`npm pack` 和 exact-tarball acceptance；真实 registry publish 不属于本 Change，只能由单独授权的发布任务执行。

## Scope

纳入范围：

- 验证并消费 `adopt-typescript-project-definition` 已交付的 current public-contract source、definition authoring types、source selection、private loading/normalization、custom execution、JSON hard cut 和 package-private execution seam；
- 在同一 current public-contract source 中补全 package version input、evidence-derived support matrix、manifest/release fields 和完整 package consumer map；
- 建立配置定义与工具运行两个公开操作、必要公共类型、runtime validation 和 structured result；
- 建立 Product-owned Bun package host、operational precedence、默认工具 effects 和 public result projection；
- hard cut Product CLI、argv/help/exit contract 与 package `bin`，并把 repository quality command 改为 API consumer；
- 从唯一 Product source 和唯一 public-contract source 构建 runtime、declarations 与 candidate manifest；
- 落实已确认的 public/MIT registry contract，并闭合 package-owned 与显式配置的外部 scanner dependencies、Bun host evidence 和允许的系统前提；
- 验证 runtime dependency closure、`0.0.x` 版本、inventory、provenance、digest 与 exact-tarball Bun consumer；
- 同步 architecture、configuration、output、testing、script tooling、CI/workspace gate 与 release procedure owners。

非目标：执行 `npm publish`、管理 registry credentials 或 Trusted Publishing；重新命名 Vibe Check；承诺 Node.js 或 dual-runtime direct import；重新实现或修改 Project Definition loader、JSON migration、foundation handoff 或 definition-facing identifiers；公开 worker/process module、IPC protocol、Core、manager、scanner adapter 或 scheduler；提供 public `init`、bootstrap、template/resource API 或第二套 Product CLI contract。

## Success Criteria

- 活动决策明确承接 Bun-only host、private runtime containment、默认工具 effects、Project Definition 配置驱动执行、exactly-two-operations surface 和 package 公共命名门禁。
- `adopt-typescript-project-definition` 已完成并归档；current public-contract source 与 package-private Project Definition/runtime seam 有目标测试和 owner 文档证明，本 Change 没有反向 handoff 或重复实现。
- Vibe Check 作为 product/display name 和 unscoped `vibe-check` public registry identity 不再是开放问题；MIT legal material 与 public package metadata 匹配，`0.0.x` release material 不承诺 package-level 跨版本兼容。
- Public imports/exports、两个操作和必要类型的 symbols、固定 Project Definition path、默认 output/cache path 及 supported environment identifiers 由 current public-contract source 唯一拥有；本 Change 只按 package/release evidence 补全该 owner，不静默改写 definition-facing values。
- 最低 Bun 版本、实际验证的 OS/architecture、允许的系统前提和 `scc`/Lizard/jscpd dependency closure 都有 exact-tarball evidence；任何外部程序均由配置显式绑定并在 work 前验证，installed consumer 不依赖 repository mise、workspace devDependencies 或未声明的 ambient `PATH`。
- Candidate manifest、public entry、declarations、配置示例、docs 和 acceptance 只从 current public-contract source 派生或核对；candidate package 不含 `bin`、public bootstrap/resource/internal execution surface 或未声明 import path。
- 配置定义操作的同步语义、工具运行操作的异步 completion/failure/cancellation 语义，以及并发 invocation 的 output/cache collision 语义均有 closed contract 与 acceptance；API 返回的 Task、Check、Record 结果和默认文件输出由同一 validated result mechanism 产生。
- Installed Bun consumer 能通过工具运行操作执行 selected Project Definition；policy、Checks、gate、scheduler、reporting、cache 和 output 由 Project Definition 驱动，当次 input 只补充 project root、source selection 和必要 operational context。
- Product-owned default runtime 提供 environment、filesystem、Git、process/thread/worker、cache、reporter 与 output 实现；普通 invocation 默认产生工具 effects，并直接返回 Task、Check、Record、diagnostics、decision 和每项 effect 的实际状态。Built-in Check 的 policy fields 与含义不泄漏 scanner-specific semantics，运行依赖层仍可显式绑定并公开说明实际工具。
- Project Definition 与 custom runner 只在 package-private runtime boundary 中执行；该边界提供进程故障 containment，不被表述成 filesystem、network、credential 或 OS permission sandbox。
- `src/product/**` 不再拥有正式 CLI、argv parser、help 或 exit mapping；repository command 只在 `scripts/**` 适配自己的命令协议并消费 public package API。
- Deterministic staging build、runtime/declaration consistency、candidate allowlist 和 exact-tarball Bun acceptance 均通过；tarball 不含 source tests、credentials、cache、artifacts 或未声明 workspace materials。
- 未获得外部写入授权时，自动化只执行 build、pack 和 verify，不读取 registry credentials，也不把 pack 成功表述为发布成功。

## Affected Owners

- `docs/decisions/product-contract/**` 与 `docs/decisions/configuration/**`：package、public API、Bun host、private runtime、default effects、configuration-driven execution、公共名称和 prestable version。
- `src/product/**`：current public-contract source 的 package/release fields、Product runtime、两个 public operations、default Bun runtime 与 private execution seam consumer。
- Root `package.json`、lockfile、build/declaration 配置和 release scripts：private workspace、staging、pack 与 acceptance。
- `docs/scanner-dependencies.md`、candidate production dependencies 与 platform packaging：installed consumer 的 scanner resolution、system prerequisite 和 dependency closure。
- `scripts/quality/**` 与 root `quality:*` scripts：repository-owned command adapter 和 dogfood consumer。
- `docs/architecture.md`、`docs/cli.md`、`docs/configuration.md`、`docs/output.md`、`docs/script-tooling.md` 与 `docs/navigation.md`：当前入口、调用关系和 owner 路由。
- `docs/testing.md`、`docs/testing/cases/**`、product tests、CI/workspace verifier 与 isolated-consumer fixtures：CLI Case 退役和 API/package 证据。
- Package legal、release notes 与 release procedure owners：registry access、license/provenance、`0.0.x` disclosure、公共契约名称和 publish 授权边界。
