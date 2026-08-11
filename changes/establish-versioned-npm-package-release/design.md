# Design

本设计用 private repository workspace + generated package staging + exact-tarball acceptance建立版本化 npm release unit，同时把 registry publish保留为独立授权动作。

## Context

当前 root `package.json` 的 name 是 `vibe-check`、version 是 `0.1.0`、`private` 为 true，正式本地入口通过 Bun直接执行 `src/product/cli.ts`；manifest没有 `bin`、`exports`、`types` 或 package contents allowlist。当前 dependencies都按 repository development组织，现有 tests不证明从 tarball安装后的 runtime/declarations/resources闭合。

活动未对齐决策 `use-versioned-npm-package-release-unit` 已确认 npm package是完整产品发布单元，CLI仍是主要执行界面而非全部 package contract；`keep-prestable-releases-on-0-0-x` 已确认稳定承诺前只使用唯一递增 `0.0.x` 且不提供 package-level cross-patch兼容推断。本 Change实施这些方向。

Public Check/Record/Policy types、`vibe-check/project` authoring surface和公开 runtime resources必须在 `establish-check-record-core`、`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 的相应 contract稳定后进入 package。依赖是material freeze/实施顺序，不阻止本 release plan先被确认。

## Goals / Non-Goals

**Goals**

- 用一个可安装、可精确锁定的 version交付匹配的 CLI、public declarations和明确资源。
- 从单一 Product source生成runtime/declarations/resources，不建立手写 distribution fork。
- 只把显式 bin、module subpaths和resource exports作为public surface。
- 对实际 candidate tarball做inventory、isolated install和consumer acceptance，而不是以worktree运行代替。
- 让本地/CI automation默认止于pack/verify，并在没有外部授权时保持publish不可达。

**Non-Goals**

- 本 Change内创建registry账号、获取name ownership、配置credentials/Trusted Publishing或执行publish。
- 把Bun产品runtime改成Node.js，或承诺未经测试的平台/runtime组合。
- 导出internal Core、scanner functions、manager/scheduler internals或generic embedding API。
- 使tarball内所有paths自动稳定，或为`0.0.x`相邻版本提供package-level兼容承诺。

## Decisions

### 1. Root manifest保持private，package从staging tree形成

Repository root继续使用 `private: true` 作为防误发布边界和开发脚本owner。Build清理并重新创建受控临时/staging输出，从 `src/product/**`、public entry sources和明确resource owners生成runtime、declarations、resources与candidate manifest。`npm pack`只在staging root执行；不得从repository root pack或publish。

Staging内容是derived release projection：不接受手工修补编译产物来修复contract。任何行为、type或resource差异回到 source/owner修改后重建。Build必须可重复，并为candidate记录source commit、package version、inventory和tarball digest。

### 2. Package identity与public interface固定为最小surface

Target package name为 `vibe-check`，installed command为 `vibe-check`。Package不建立root JavaScript embedding export；主要执行surface由 `bin`提供。Project authoring只通过explicit `./project` export（consumer specifier `vibe-check/project`）暴露matching runtime identity helpers和 `.d.ts`。

Schema、starter或其它public material只有在各自owner明确要求consumer访问时，才以candidate manifest中的逐项explicit export加入；不使用会自动公开未来文件的wide wildcard。CLI内部资源可以随包存在但不因此成为public path。Export map与files allowlist共同拒绝偶然internal import。

在首次external publish前必须按registry authority验证 `vibe-check` name ownership/availability；如果本项目不能合法使用该identity，变更package name及所有public specifiers属于本Change的实质plan修订，不能由publish命令临时改名。该external check不阻塞local build/pack/verify，也不代表已获得publish授权。

### 3. Installed CLI继续以Bun为runtime

Build产生可由package bin链接执行的Bun entry，并在candidate manifest声明从acceptance evidence得出的minimum supported Bun version。采用npm作为分发载体不改变Bun runtime。CLI启动时若Bun/platform prerequisite不满足，使用可行动diagnostic；不静默回退到Node执行或repository source。

所有runtime imports必须在tarball中、由declared production dependencies提供，或是明确且可诊断的平台prerequisite。Current devDependencies需按actual runtime graph重新分类；installed path不得依赖root workspace、`scripts/**`、tests、fixtures或dev-only resolver behavior。

### 4. Runtime与declarations从同一public source contract生成

CLI runtime、`vibe-check/project` helpers和owner-declared public types使用明确entry modules。Build对runtime进行Bun-compatible emit/bundle，并从相同public TypeScript source生成 `.d.ts`；declaration build不得维护另一套handwritten shape。Runtime validators继续是load authority，types提供authoring检查而不代替runtime validation。

Package version、built-in identities、starter/template与public schemas在同一build snapshot中解析。Generated code/resource复制采用manifest-driven清单和drift tests，避免某一材料从repository path单独补齐。

### 5. Prestable version由release history约束

Candidate version必须是 `0.0.<patch>`。Implementation在选择patch前核对本项目拥有的authoritative release history：若没有既有owned `0.0.x` release，首个candidate使用 `0.0.1`；否则使用大于全部既有owned `0.0.x` patch的唯一下一值。Root当前 `0.1.0`不代表已发布稳定线，不能作为继续使用nonzero minor的理由。

Release notes和install guidance明确说明相邻 `0.0.x`可以breaking，并建议精确锁定；已经由更具体schema/identity决策承诺的稳定surface继续遵守自身contract。进入 `0.y.z` (`y > 0`) 必须另有product owner明确决定，不能由本Change完成度推断。

### 6. Candidate acceptance只针对exact tarball

Build后运行 `npm pack --json` 形成一个candidate tarball，并从其pack metadata和实际archive双重检查inventory。验收在安全temporary consumer root安装该exact tarball，不能link repository worktree。至少证明：

1. package name/version/bin/exports/types/engines/dependencies与计划一致；
2. installed `vibe-check --help`、`init`、ungated neutral scan和representative configured scan使用package内runtime/resources；
3. independent TypeScript consumer import `vibe-check/project` 并typecheck，不读取repository source；
4. 每个explicit public resource export可消费，undeclared internal paths不获得supported import；
5. candidate不包含sources、tests、credentials、cache、artifacts或未声明workspace materials；
6. generated provenance、version output、inventory和tarball digest相互一致。

Acceptance失败使candidate不可发布，不能用worktree tests通过覆盖。

### 7. Pack与publish是不同授权边界

Project scripts只提供deterministic build、pack和verify；这些动作可在local/CI重现且不写registry。不得设置会在普通build/test/package lifecycle隐式publish的hook，也不在repository保存token、cookie或registry credential。

真实 `npm publish` 必须由未来当次任务明确给出target registry、package identity/version和外部写入授权，并在publish前重新验证candidate、name ownership、authentication和version absence。Publish成功后的registry observation、tag和install smoke属于该future动作的交付证据，不由本Change的local archive/stage或pack结果宣称。

## Risks / Trade-offs

- **Staging build增加一层derived output。** 它保留root private safety并让tarball contents可审计；manifest-driven generation和drift tests防止第二owner。
- **Bun prerequisite降低部分npm consumer可达性。** 这是当前产品runtime的诚实边界；Node-compatible build需要独立设计和证据，不能由npm载体暗示。
- **Public type/resource surface可能在foundation变化时漂移。** Release implementation在上游contracts稳定后freeze entries，并用同版本consumer tests闭合。
- **Unscoped package name可能不可用或不归本项目。** Local candidate可以使用目标identity；external publish前必须核权，冲突时显式修订package identity而非临时绕过。
- **`0.0.x`不提供默认兼容保证。** Release notes明确breaking risk，但更具体schema/identity约束仍保持。
- **Installed tests可能意外使用global/worktree dependencies。** Temporary consumer使用exact tarball、受控PATH/working directory和inventory assertions，验证实际runtime closure。

## Open Questions

无阻塞本地implementation的问题。External registry ownership、credentials、target tag与实际publish时机只在未来获得明确外部写入授权的任务中核对；它们不属于本Change的build/pack/verify出口。
