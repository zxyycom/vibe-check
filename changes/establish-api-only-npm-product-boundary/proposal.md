# Proposal

本 Change 在 `adopt-typescript-project-definition`、`adopt-composable-check-tree` 与
`support-check-scoped-concurrency` 完成并归档后，把其 Product 运行内核投影为 API-only npm package。
首个 package 只支持 Bun，runtime callable exports 恰好是：

1. **配置定义函数**：帮助项目作者形成 typed Project Definition；
2. **Package Run**：接收 `(Project Definition, Run Controls)` 并执行 Vibe Check。

使用项目自行维护项目配置文件和项目运行脚本。项目运行脚本把 Project Definition 绑定到 Package Run，并导出“项目 Run”；其他调用方只调用项目 Run，不需要再次导入或传入配置。

```text
其他调用方
  → 项目 Run（项目拥有）
  → Package Run（package 公开）
  → Product 运行内核（前置 Change 交付）
  → 配置中的项目函数
  → 既有 Task 系统
```

## Why

当前正式产品入口仍是 `src/product/**` 下的 Bun CLI，行为依赖 argv、console 和 exit code；root `package.json` 也是 `private: true` 的 workspace manifest。这些事实不能证明普通项目可以安装、导入并运行一个依赖闭合的 package。

前置 Changes 已负责 Project Definition authoring/validation、Package Run 的 Product 运行内核、项目函数
调用、composable Check tree、built-in descriptor options、Check-scoped concurrency、Task 调度、operational
dependency snapshot、JSON hard cut 和两文件使用模式。本 Change 不重新设计这些语义，只负责：

- 公开正确且最小的 package surface；
- 提供 Bun default host 和 installed dependency closure；
- 从唯一 current public-contract source 生成可审计 candidate；
- 用 exact tarball 证明真实项目的配置文件、运行脚本和外部调用方可以协作；
- replacement 通过后删除 Product CLI contract。

当前 repository 通过 mise、workspace dependencies 和开发环境提供 `scc`、Lizard、jscpd 等 scanner 条件。Installed consumer 不具备这些隐含条件，因此每项 runtime dependency 必须成为 package production material，或成为文档化、可验证且由配置显式绑定的 external prerequisite。

## Outcome

Repository root 保持 `private: true`。受控 build 从 Product source 和 current public-contract source 生成 staging tree；`npm pack` 只针对 staging root。

Candidate package 具有以下边界：

- public runtime callable exports 只有配置定义函数和 Package Run；另导出三个 non-callable built-in
  descriptor values 与必要 public types；
- manifest 不含 `bin`，也不公开 Product `init`、resource/bootstrap、Core、manager、scheduler、Task、worker 或 IPC surface；
- Package Run 直接消费前置 Change 的运行内核，不插入配置 discovery、module loader、函数序列化或 whole-invocation worker；
- Bun default host 提供 filesystem、Git、environment、subprocess、cache、reporter 和 output 能力；
- 普通 invocation 保留上游定义的 structured result、default effects、Task scheduling 和 operational dependency semantics；
- canonical installed example 包含项目配置文件、项目运行脚本和一个只调用项目 Run 的独立 caller；
- repository dogfood command 位于 `scripts/**`，作为 project-owned adapter 消费同一 package API；
- package identity 为公开的 unscoped `vibe-check`，使用 MIT 和 `0.0.x` prestable version；
- release workflow 止于 deterministic build、pack 和 exact-tarball acceptance，真实 `npm publish` 不属于本 Change。

## Scope

纳入范围：

- 验证并消费前置 Changes 交付的 Product 运行内核、current-contract fields、composable Check tree、
  Check-scoped concurrency 与 canonical usage；
- 在同一 current public-contract source 中补全 package/release fields、license、candidate version inputs、support matrix、system prerequisites 和 consumer map；
- 建立两个 public callable exports、三个 non-callable built-in descriptor values、必要 types、Bun default
  host 和 structured result projection；
- 闭合 package-owned 或 configured-external scanner dependencies；
- 从 authoritative sources 生成 runtime、declarations、candidate manifest、MIT materials、inventory、provenance 和 digest；
- 建立 exact-tarball installed project 与 separate-caller acceptance；
- replacement acceptance 通过后 hard cut Product CLI、argv/help/exit contract 和 package `bin`；
- 同步 architecture、configuration、output、testing、script tooling、CI/workspace gate 和 release procedure owners。

不纳入范围：

- 重新定义 Project Definition、Package Run、Task scheduler、operational precedence 或 JSON migration；
- 固定消费者项目的配置文件或运行脚本路径；
- 支持 Node.js direct import 或 dual-runtime build；
- 提供 whole-invocation process isolation 或 permission sandbox；
- 公开内部 execution surface 或建立第二套 Product CLI；
- 管理 registry credentials、配置 Trusted Publishing 或执行 `npm publish`。

## Success Criteria

- 三个前置 Changes 已完成并归档；本 Change 只消费其 owner docs、current-contract fields、Product
  运行内核、Check tree/cap semantics 和目标测试，不建立竞争 owner。
- AI 或工程实现者能从 Design 区分配置定义函数、Package Run 和项目 Run，并恢复完整调用方向。
- Public runtime callable export inventory 恰好包含配置定义函数和 Package Run；`duplicateDetection`、
  `fileMetrics`、`functionMetrics` 是额外的 frozen non-callable values，必要 types 不形成额外 operation。
- Installed project 可以自行创建配置文件与运行脚本；独立 caller 只传项目允许的 controls 并获得完整 result。
- Package Run 保持上游的同-runtime 项目函数调用与 Task 系统语义，不宣称 whole-invocation isolation。
- Public symbols、default paths、environment identifiers、dependency identifiers 和 package/release values 各有唯一 current owner；项目文件路径不进入 package contract。
- 最低 Bun、OS/architecture、system prerequisites 和 scanner dependency closure 都有 exact-tarball evidence；external executables 不从 repository state、workspace devDependencies 或 ambient `PATH` 隐式获得。
- Candidate manifest、entry、declarations、docs、examples 和 acceptance 从 current public-contract source 生成或单向核对，不包含 `bin` 或 unsupported imports。
- Product CLI 与 argv/help/exit contract 只在 exact-tarball replacement 通过后删除；repository commands 改为调用项目 Run 的 adapter。
- Repeated clean build 产生一致的 allowlisted artifacts；tarball 不包含 tests、credentials、cache、临时 artifacts 或 undeclared workspace material。
- 未获得单独外部写入授权时，只执行 build、pack 和 verify，不读取 registry credentials，也不把 pack 描述成 publish。

## Affected Owners

- `adopt-typescript-project-definition`：Project Definition、Package Run 内核、项目函数、Task/dependency 和 canonical 两文件模式的前置 owner。
- `adopt-composable-check-tree`：built-in descriptor values/options、Check tree、leaf selection、group
  flattening 与 flat catalog/private binding handoff 的前置 owner。
- `support-check-scoped-concurrency`：Check `maxParallel` inheritance、active-cap admission/drain 与 single
  shared scheduler handoff 的前置 owner。
- `docs/decisions/product-contract/**` 与 `docs/decisions/configuration/**`：API-only、Bun host、public/MIT、effects、naming 和 runtime boundary 的长期方向。
- `src/product/**`：current public-contract source、public projection 和 Bun default host。
- Root `package.json`、lockfile、build/declaration config 与 release scripts：private workspace、staging、pack 和 acceptance。
- `docs/scanner-dependencies.md` 与 production dependency owners：installed dependency closure。
- `scripts/**`：repository-owned project Run adapter 与 dogfood command。
- Architecture、CLI、configuration、output、testing、script-tooling、navigation、CI 和 release procedure owners：入口、验收与发布边界。
