# Proposal

本 Change 建立 Vibe Check 的 API-only npm 产品边界：首个 package 只支持 Bun，公开 API 恰好包含配置定义与工具运行两个操作，并在同一实施边界 hard cut 当前 Product CLI。

## Why

当前产品事实仍是 `src/product/**` 拥有的 Bun CLI，正式入口依赖 argv、console 和 exit code；root `package.json` 也是 `private: true` 的 workspace manifest，不能证明可安装 API 的 runtime、声明和依赖闭合。Package 消费者需要把 Vibe Check 直接组合进自己的工具、服务、编辑器或 agent，并从结构化结果恢复执行事实。

Vibe Check 仍是有日志、缓存、输出和运行时依赖的配置驱动工具。API-first 只改变正式集成边界，不把产品改成无副作用的纯函数，也不要求调用方实现 environment、filesystem、Git、process、thread 或 worker 等低层能力。

Vibe Check 继续作为产品显示名；待确认的是 registry package、public exports/symbols、固定 Project Definition 路径和运行标识。这些字符串会成为首个 package 契约，不能从 root manifest、源码、Change 名称或示例自动推导。

## Outcome

Repository root 保持 private。受控 build 从权威 Product source 和唯一 current public-contract source 生成 package staging tree；candidate manifest 不含 `bin`，公开 callable surface 恰好包含：

1. 在使用者拥有的 TypeScript Project Definition 文件中调用的配置定义操作；
2. 加载该 definition 并运行完整工具的工具运行操作。

支撑这两个操作的公共类型属于同一契约，不形成第三项操作。Product 提供 Bun default runtime，在 package-private worker 或 child-process boundary 中加载 Project Definition 和 custom runner；普通 invocation 默认产生受控日志/progress、适用缓存和 canonical output，同时返回结构化领域结果、diagnostics、decision 与 effect status。

Repository dogfood command 位于 `scripts/**`，只拥有自身 argv、console 和 exit mapping，并作为 package API consumer 调用 Vibe Check。发布流水线止于 deterministic build、`npm pack` 和 exact-tarball acceptance；真实 registry publish 仍需未来任务明确授权。

## Scope

纳入范围：

- 建立配置定义与工具运行两个公开操作、必要公共类型、runtime validation 和 structured result；
- 建立 Product-owned Bun default runtime、operational precedence、默认工具 effects 和 package-private project-code containment；
- hard cut Product CLI、argv/help/exit contract 与 package `bin`，并把 repository quality command 改为 API consumer；
- 从唯一 Product source 和唯一 public-contract source 构建 runtime、declarations 与 candidate manifest；
- 验证 runtime dependency closure、`0.0.x` 版本、inventory、provenance、digest 与 exact-tarball Bun consumer；
- 同步 architecture、configuration、output、testing、script tooling、CI/workspace gate 与 release procedure owners；
- 在 publishable candidate 形成前确认 registry package、imports/exports、symbols、固定路径、默认 effect 路径和 environment identifiers。

非目标：执行 `npm publish`、管理 registry credentials 或 Trusted Publishing；重新命名 Vibe Check；承诺 Node.js 或 dual-runtime direct import；公开 worker/process module、IPC protocol、Core、manager、scanner adapter 或 scheduler；提供 public `init`、bootstrap、template/resource API 或第二套 Product CLI contract。

## Success Criteria

- 活动决策明确承接 Bun-only host、private runtime containment、默认工具 effects、Project Definition 配置驱动执行、exactly-two-operations surface 和 package 公共命名门禁。
- Vibe Check 作为 product/display name 不再是开放问题；registry package、public imports/exports、两个操作和必要类型的 symbols、固定 Project Definition path、默认 output/cache path 及 supported environment identifiers 已分别确认。
- 已确认的公共值只由一个 current public-contract source 完整承接；candidate manifest、declarations、配置示例、docs 和 acceptance 只从该 owner 派生或核对。
- Candidate package 不含 `bin`、public bootstrap/resource/internal execution surface 或未声明 import path；public callable surface 恰好包含配置定义与工具运行两个操作。
- Installed Bun consumer 能通过工具运行操作执行 selected Project Definition；policy、Checks、gate、scheduler、reporting、cache 和 output 由 Project Definition 驱动，当次 input 只补充 project root、source selection 和必要 operational context。
- Product-owned default runtime 提供 environment、filesystem、Git、process/thread/worker、cache、reporter 与 output 实现；普通 invocation 默认产生工具 effects，并直接返回领域结果、diagnostics、decision 和每项 effect 的实际状态。
- Project Definition 与 custom runner 只在 package-private runtime boundary 中执行；该边界提供进程故障 containment，不被表述成 filesystem、network、credential 或 OS permission sandbox。
- `src/product/**` 不再拥有正式 CLI、argv parser、help 或 exit mapping；repository command 只在 `scripts/**` 适配自己的命令协议并消费 public package API。
- Deterministic staging build、runtime/declaration consistency、candidate allowlist 和 exact-tarball Bun acceptance 均通过；tarball 不含 source tests、credentials、cache、artifacts 或未声明 workspace materials。
- 未获得外部写入授权时，自动化只执行 build、pack 和 verify，不读取 registry credentials，也不把 pack 成功表述为发布成功。

## Affected Owners

- `docs/decisions/product-contract/**` 与 `docs/decisions/configuration/**`：package、public API、Bun host、private runtime、default effects、configuration-driven execution、公共名称和 prestable version。
- `src/product/**`：Product runtime、两个 public operations、default Bun runtime、private execution boundary 与 Project Definition authoring contract。
- Root `package.json`、lockfile、build/declaration 配置和 release scripts：private workspace、staging、pack 与 acceptance。
- `scripts/quality/**` 与 root `quality:*` scripts：repository-owned command adapter 和 dogfood consumer。
- `docs/architecture.md`、`docs/cli.md`、`docs/configuration.md`、`docs/output.md`、`docs/script-tooling.md` 与 `docs/navigation.md`：当前入口、调用关系和 owner 路由。
- `docs/testing.md`、`docs/testing/cases/**`、product tests、CI/workspace verifier 与 isolated-consumer fixtures：CLI Case 退役和 API/package 证据。
- Package legal、release notes 与 release procedure owners：license/provenance、`0.0.x` disclosure、公共契约名称和 publish 授权边界。
