---
title: "SCC 与 jscpd 升级就绪性评估"
formedAt: "2026-09-01T06:25:22+00:00"
question: "相对 Vibe Check 当前锁定的 SCC 3.7.0 与 jscpd 5.0.11，官方最新稳定版分别改变了什么；现有 adapter、finding/measurement contract、安装、candidate 与 Project Gate 是否适合升级？"
tags:
  - "dependency-upgrades"
  - "duplicate-detection"
  - "file-metrics"
  - "jscpd"
  - "scc"
relations: []
---

## 形成时背景

Vibe Check 将 external scanner 作为 producing Check 的私有实现，不是可互换的共享 backend：`fileMetrics` 独占 SCC command、version probe、CSV parser、measurement conversion 与 failure semantics；`duplicateDetection` 独占 jscpd package-bin resolution、version/config/report protocol、JSON parser 与 raw-cache identity。`docs/scanner-dependencies.md` 要求 scanner 只接收 approved exact paths，并在 Record conversion 前重验 source-path membership；process、report、parse 或 scope 异常必须 fail closed 为 `unavailable`。

形成时的仓库基线和接受边界如下：

| 工具 | repository baseline | consumer/runtime acceptance | Vibe Check 实际协议 |
| --- | --- | --- | --- |
| SCC | `mise.toml` / `mise.lock` 固定 `github.com/boyter/scc/v3@v3.7.0` 和 Go `1.25` | `fileMetrics` 只接受精确 stdout `scc version 3.7.0` | `--version`；再执行 `--by-file --format csv <approved paths…>`；strict 十列 header，消费 `Code` 和 `Complexity` |
| jscpd | `package.json` / `pnpm-lock.yaml` 固定 `5.0.11` | 发布 candidate 声明 `^5.0.11`，即 `>=5.0.11 <6.0.0`；custom command 只需可识别版本及协议可用 | 从安装 manifest 解析受限 `bin.jscpd`，以 active Bun 执行；显式 `--config <temp>` 的 exact absolute paths、`minLines`、`minTokens`、`reporters:["json"]`、`absolute:true`、`silent:true`，再读 `jscpd-report.json` |

本轮形成日为 **2026-09-01**。仅调查 SCC 与 jscpd；未安装或更新依赖与工具，未修改 product、lockfile、mise、Decision 或 Change，也没有远端写入。

**用途与权威边界。** 本报告用于把后续升级工作路由为“可作为近期候选”或“必须单独规划”，并保存形成时依据；它不是当前依赖规范、长期 Decision 或实施授权。当前版本和协议由 repository owner/代码维护，兼容方向由 aligned Decisions 维护，实施范围与验收由获得授权的 Change 维护。若这些当前 owner 或 live upstream state 与本报告冲突，应重新调查，而不是沿用本报告中的版本结论。

## 调查目的

本轮回答四个问题：

1. 两个 baseline 是否已有官方稳定版更新，版本间的行为、协议、分发与许可证改变是什么？
2. SCC CSV/version adapter 和 jscpd JSON/version/config adapter 是否能继续形成可信 measurement 与 finding？
3. 新版本如何影响 repository 安装、published candidate、外部 consumer 与 Project Gate？
4. 哪些结论是源码/发布材料确认的事实，哪些须由实际 candidate/Gate 运行证明？

“更新 repository baseline”与“已经由 published `^5.0.11` 自动解析到的 consumer version 能否工作”是两件不同的事。scanner 成功解析不证明 finding/metric 不变；candidate 的实际安装版本和真实 Run 仍是独立证据。

预期使用结果是明确恢复三项动作边界：哪个工具可进入近期升级候选、哪个工具不能直接改 pin/version gate，以及各自开始实施前必须取得什么证据。本报告不要求也不授权立即修改依赖。

## 调查范围与依据

**仓库依据（实际读取）。** 读取根 `AGENTS.md`、investigation-report 固定契约、`docs/scanner-dependencies.md`、两项 Check guide、SCC/jscpd Decisions、`mise.toml`/lock、`package.json`/lock、SCC/jscpd adapters 与相邻 tests、measurement/execution/cache identity、candidate install 与 external-consumer runtime evidence。关键位置包括：

- [`file-metrics/scc/parser.ts`](../../src/package-checks/file-metrics/scc/parser.ts) 定义 `SCC_VERSION_OUTPUT` 和 strict CSV header；[`availability.ts`](../../src/package-checks/file-metrics/scc/availability.ts) 精确比较版本；[`scanner.ts`](../../src/package-checks/file-metrics/scc/scanner.ts) 不传 `--no-config`。
- [`duplicate-detection/jscpd/command-resolution.ts`](../../src/package-checks/duplicate-detection/jscpd/command-resolution.ts) 验证 package manifest/bin containment；[`scanner.ts`](../../src/package-checks/duplicate-detection/jscpd/scanner.ts) 始终传**显式**临时 `--config`；[`json-report.ts`](../../src/package-checks/duplicate-detection/jscpd/json-report.ts) 只依赖 `duplicates`、`lines`、`tokens`、两端 file/name/start/end（或 Loc）；[`cache/identity.ts`](../../src/package-checks/duplicate-detection/cache/identity.ts) 用实际 probe version 隔离 raw cache。
- [`repository-quality.ts`](../../scripts/project/gate/checks/repository-quality.ts) 仅接收 mise 提供的绝对 `VIBE_CHECK_SCC_CMD`；candidate 先验证 jscpd range 与 bin containment，external consumer 再运行真实 `duplicateDetection`。

**SCC 一手依据。** 官方 tag `v3.7.0` 是当前 baseline；`v4.0.0`（2026-08-24）是远端最高稳定 tag。官方 GitHub API 的 [`releases/latest`](https://api.github.com/repos/boyter/scc/releases/latest) 也返回 non-prerelease `v4.0.0`、2026-08-24 published release 和 checksums/platform binary assets；因此本报告称其为“最新稳定 tag/release”。GitHub Releases 的 HTML list 曾显示 `v3.7.0` 的 Latest 标记，不能覆盖 API/tag/asset 的当前事实，故不据此推断 v4 缺少发布资产。官方 [`v3.7.0...v4.0.0 compare`](https://github.com/boyter/scc/compare/v3.7.0...v4.0.0) 显示 111 commits、1,074 changed files；[`v4 release notes`](https://raw.githubusercontent.com/boyter/scc/v4.0.0/NOTES.md)、两个 tag 的 `go.mod`、`LICENSE` 与 CSV formatter 是变更、分发和协议依据。

**jscpd 一手依据。** 调查时 live npm registry [`dist-tag latest`](https://registry.npmjs.org/jscpd/latest) 返回 `jscpd@5.1.1`（其 `gitHead` 是 `9db945c…`，optional packages 为 7 个）；官方 GitHub [`latest release`](https://api.github.com/repos/kucherenko/jscpd/releases/latest) 为 non-prerelease `v5.1.1`、2026-08-31。读取官方 `v5.0.11`、`v5.0.16`、`v5.1.0`、`v5.1.1` tags，及 [`v5.0.11...v5.1.1 compare`](https://github.com/kucherenko/jscpd/compare/v5.0.11...v5.1.1)、[`v5.1.0...v5.1.1 compare`](https://github.com/kucherenko/jscpd/compare/v5.1.0...v5.1.1)、[root changelog](https://raw.githubusercontent.com/kucherenko/jscpd/v5.1.1/CHANGELOG.md)、[Rust release changelog](https://raw.githubusercontent.com/kucherenko/jscpd/v5.1.1/rust/CHANGELOG.md)、[`v5.1.1` wrapper manifest](https://raw.githubusercontent.com/kucherenko/jscpd/v5.1.1/rust/jscpd/package.json) 和 [JSON reporter](https://raw.githubusercontent.com/kucherenko/jscpd/v5.1.1/rust/crates/cpd-reporter/src/json_reporter.rs)。

**未做的验证。** 未让 `scc@4.0.0` 或 `jscpd@5.1.1` 实际执行本仓库/Candidate，也没有 multi-platform install、differential corpus 或 Gate run。因此以下“兼容候选”只说明源码/分发表面可复核，不能证明 findings、paths、性能或安装结果完全等价。

## 调查结果与边界

### 结论与行动顺序

| 顺序 | 工具与版本 | 当前结论 | 获得实施授权后的最小下一步 |
| --- | --- | --- | --- |
| 1 | jscpd `5.0.11 → 5.1.1` | **优先建立 repository baseline 升级候选，但尚未验证完成。** Published `^5.0.11` 已会接受 5.1.1；5.1.0 存在 wrapper/engine skew，不能作为目标版本 | 在隔离 candidate 中直接安装并验证 5.1.1，证明实际 engine version、bin containment、JSON/path/exact scope、cache、findings 与 real external-consumer Run |
| 2 | SCC `3.7.0 → 4.0.0` | **不直接升级。** 这是会改变 version、Go module/toolchain、config loading 和计量语义的 major upgrade | 单独建立 SCC upgrade Change，先决定 config isolation，再验证 `/v4` 安装、CSV/measurement differential 与真实 Gate Run |

不能把 jscpd 的同-major候选路径套用到 SCC，也不能只修改 pin/version string 后把命令成功当作兼容证明。以下章节分别给出这两个结论的事实、推断和未验证边界。

### SCC：最新 stable 为 v4.0.0，但不应直接升级

**已确认事实。** SCC `v4.0.0` 相对 `v3.7.0` 是 major upgrade，仍为 MIT。官方 release notes 明示同一调用可因“last duplicate flag wins”、Linguist-inspired language detection、每用户/每项目 config override 而得到不同输出；并新增 MCP、git processing、LOCOMO、infographic/JSON percentage、external ignore file、语言/复杂度/parser fixes 与性能改进。v4 `go.mod` 从 `github.com/boyter/scc/v3`/Go `1.25.2` 变为 `/v4`/Go `1.26.4`；官方 release 有 checksums 与 Darwin/Linux/Windows binary assets。

**SCC adapter、measurement、Gate 的影响。**

- **确定失败：** v4 输出 `scc version 4.0.0`，现 adapter 精确要求 3.7.0。只改 mise executable 就会让 `fileMetrics` 成为 `unavailable / external-dependency-unavailable`，Gate 的该 observation 同样不可用。
- **窄的协议兼容候选：** 在未启用 `--cognitive` 时，v4 `--by-file --format csv` 仍输出 current 十列 `Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC`；这不足以跳过实际 parser test。
- **仍未隔离的配置风险：** adapter cwd 为 project root 且没传 `--no-config`。v4 可加载 `SCC_CONFIG_PATH` / `.sccconfig`；其中 `--cognitive` 会使 CSV 加第 11 列并使 strict parser fail closed，其他 detection/ignore/complexity flag 可改变 measurement。显式 `--by-file --format csv` 由于 v4 last-wins 覆盖同名先前 flags，却不覆盖其他 config。approved path membership 仍能拒绝 out-of-scope paths，不能保证 `Code`/`Complexity` 数值不变。
- **finding contract：** `Code` 决定 code-line finding，`Complexity` 决定 low-decision-token allowance；语言识别与复杂度修复可改变 Record、waiver reconciliation、`findingCount` 与 blocking outcome，即使 header 不变。

**建议（基于确认事实）。** 暂不直升 SCC。若另行授权 Change，需共同验证 `/v4` + Go 1.26.4 的 mise path/lock 和 Gate handoff，明确是否以 `--no-config` 固定可复现边界，更新 version/docs/tests，并以多语言 corpus 比较 `Code`、`Complexity`、CSV/path 与 final findings。不要只放宽 version gate；那会静默接受尚未验证的 schema/config/计量变化。

### jscpd：latest 为 5.1.1；应更新 baseline，但候选必须直验 5.1.1

**已确认的版本演进（`5.0.11 → 5.1.1`）。** 许可证仍为 MIT、wrapper 仍声明 Node `>=18`、`bin.jscpd` 仍是相对 `run-jscpd.js`；release window 包含：

| release | 官方主要变化及与本产品的相关性 |
| --- | --- |
| 5.0.12 / 5.0.13 | Rust dependencies；5.0.13 是 `cpd` npm wrapper/platform pin 的 republish、无 scanner code change。它是后续 `jscpd` wrapper pin 问题的前例。 |
| 5.0.14 | opt-in cross-format detection；纯 Markdown prose 开始 tokenized，纳入 Markdown scope 时 findings 可能变化。 |
| 5.0.15 | scan-root-relative report paths、多-root blame、git root discovery 修复；SARIF additions。临时 config/absolute exact paths 的 adapter 必须实测 report path。 |
| 5.0.16 | opt-in MCP、summary、skip-isolated、supply-chain hardening；不传相应 option 时不新增 Vibe Check capability。 |
| 5.1.0 | baseline / baseline-from-ref、OpenMetrics 与 CodeClimate reporters、`.config/jscpd.json` auto discovery、unknown `--format` 警告、Windows ARM64 platform package。其 JSON 多出 additive `isNew`、baseline statistics/可选 output；当前 parser 忽略未知字段。 |
| 5.1.1 | 修复 **`jscpd@5.1.0` wrapper 实际固定 5.0.16 platform binaries**、导致 `jscpd --version` 为 `cpd 5.0.16` 而所有 5.1.0 scanner fixes 不生效；release workflow 现在校验 wrapper/platform pins 与 release version 对齐。另将 declared Rust MSRV 更正为 1.96 并在 CI 强制验证；这影响 crates/source build，不直接改变 npm wrapper 的 runtime protocol。 |

**jscpd adapter/config/JSON/path 的影响。**

- `^5.0.11` 确实自动接受 `5.1.1`，所以新的 package consumer 可能在 Vibe Check 未发新版时获得它；lockfile 仍使 repository evidence 停在 5.0.11。`5.1.0` 虽也在 range 内但因 wrapper/engine version skew 不能作为验证 target，candidate 必须直接验证 **5.1.1**。
- `checkJscpd` 只要求可识别 `jscpd`/`cpd` version，不以 5.0.11 拒绝 runtime。5.1.1 会令 raw-cache `toolVersion` 改变，旧 5.0.11 fragments 不会复用。`5.1.1` JSON 仍含所需 `lines`、`tokens`、`firstFile`/`secondFile`、`name`、`start`/`end`、`startLoc`/`endLoc`；新增 `isNew`，并仅在 `--summary` 时新增 top-level `summary`，均不破坏 current parser。
- `.config/jscpd.json` discovery 是 v5.1.0 的 scanner feature，但 Vibe Check 每次传显式临时 `--config`，官方 loader 在指定 config 时不走 auto discovery。因此 root `.jscpd.json`、`.config/jscpd.json` / `.config/.jscpd.json` 不应影响这个 adapter invocation；这是比 SCC v4 更强的 config isolation。仍须 e2e 证明 temp config 与 `absolute:true` 下的 5.0.15 path 修复可被 current normalizer/exact-scope acceptance 正确处理。
- unknown `--format` 改为 warning 而非静默 0-file scan；current adapter temp config 不写 `format`，因而不是直接行为变化。它仍应加入 custom config/adapter regression evidence，以证明未来不误将 scanner warning/empty results 解读为可信空结果。
- baseline、MCP、OpenMetrics、CodeClimate、cross-format、skip-isolated 都未由 adapter 传入；它们不成为 public Check options。若 consumer 自行使用 jscpd config，不应绕过 adapter-owned temp config。

**分发、candidate 与 Gate 的影响。** 5.1.1 optional platform packages 从 5.0.11 的六个变为七个，新增 `jscpd-windows-arm64-msvc`；其 runner 仍按 OS/CPU/libc 选择 package。Vibe Check 只验证 wrapper manifest 内 bin target，不检查 optional dependency names；没有确认需要 adapter source change。可是 5.1.0 已证明“package version 满足 range”不等于“实际 spawned engine 相同版本”，所以 candidate 必须确认 5.1.1 wrapper 的 `--version` 实际返回 5.1.1，并验证 bin containment、7-target resolution policy、JSON/path/exact scope、version-triggered cache miss 与 real `duplicateDetection` Run。当前 repository Gate 在 lockfile 更新前仍使用 5.0.11；published candidate 的 external consumer 可因 `^5.0.11` 直接解析到 5.1.1，更新 repository baseline 后 Gate 才会改用 5.1.1。两条路径都必须以各自的 real Run 验收，不能用一次 lockfile edit 互相替代。

**建议（基于确认事实与未验证边界）。** jscpd 的 repository baseline 应计划从 5.0.11 升到 **5.1.1**，优先级高于 SCC：它在现有 published major range 内，JSON required shape 与 adapter-owned explicit config 未见确认破坏，且 5.1.1 修复了 5.1.0 wrapper/engine skew、补齐 Windows ARM distribution。但不得称为“已验证升级”：只接受 5.1.1（不接受 5.1.0）作为 candidate 目标，并在隔离安装中运行 real consumer/Gate evidence，覆盖 Markdown、multi-root/path、Windows ARM optional package，以及 external config discovery 不泄漏进 explicit temp config。

### 证据强度、未知与重新调查条件

| 结论强度 | SCC v3.7.0 → v4.0.0 | jscpd v5.0.11 → v5.1.1 |
| --- | --- | --- |
| 已确认 | latest stable tag/release 为 v4.0.0，且有 official binary assets；version gate 必失败；`/v4` 与 Go 1.26.4；默认 non-cognitive CSV header 可作为兼容候选，计数语义会变 | npm/GitHub latest 为 5.1.1；`^5.0.11` 会接受它；JSON required fields 保持、增加 ignored `isNew`；7 个 optional packages；5.1.1 修复 5.1.0 wrapper 实际运行 5.0.16 的 skew |
| 推断 | 应明确 config isolation、而非仅放宽 version；parser 可在 differential evidence 后升级而非重写 | current adapter 大概率不需 source change；5.0.15 path behavior 可被 current normalizer 接受，但须真实 run；explicit config 应隔离 `.config` auto-discovery |
| 当前未知 | `/v4` + Go 1.26.4 的 mise installation、所有 Gate platform、actual CSV/findings diff、config policy | 5.1.1 Vibe Check candidate 的真实 7-platform/package resolution、version output、JSON/path/findings、cache/Gate evidence；Markdown/multi-root corpus 的结果变化 |

本报告仅适用于形成时 repository pins、live npm dist-tag、official tags/releases 和当前 adapter source。新的上游 tag/dist-tag、Go/mise 分发变化、scanner options/areas/contracts 变化，或真实 candidate/Gate differential evidence 出现时，应形成复查或在授权 Change 中重新评估。报告不改变当前 owner、Decision、产品 API 或已发布 package，也不授权实施升级。
