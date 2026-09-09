# Design

0.0.2 按“发布分支准备 → 冻结源码 → 正式验收与发布 → 分发验证 → 合回 main”推进。通用流程由 [Package release](../../docs/tooling/package-release.md)拥有；按 [tasks](tasks.md)记录本次进度。

## Context

- [proposal](proposal.md#resulting-impacts)列出的上游提交已进入本次 Plan 基线；末轮启发式研究未替换既有算法，不表示整个 `v0.0.1` 至本次基线区间没有调度实现变化。
- 已有[源码差异调查](../../docs/investigations/audit-0-0-2-upgrade-differences.md)和升级说明初稿。旧版的可追溯源码为 `v0.0.1` → `2a454f0a`，调查端点为 `c0af9fff`。
- 用户要求从完整 Git log、提交信息与部分形成时文档重新反查，补足旧稿遗漏；本次交付收敛为一份 changelog，同时说明净变化与升级影响。
- `main` 保持在 `c0af9fff`，比 `v0.0.1` 多 213 个可达提交；已从该基线创建 `release-0-0-2`，发布准备在该分支的 `/workspace/vibe-check` 实现工作区维护，并已按授权分次提交。冻结工作区及正式源码 S 尚未建立。
- 已确认采用[无前缀分支命名](../../docs/decisions/use-unprefixed-project-branch-names.md)和[发布源码与 Change 隔离](../../docs/decisions/isolate-package-release-source-from-change-work.md)。main 保持集成主线。
- 继续遵守 [0.0.x 版本线](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)、[个人 scope](../../docs/decisions/publish-user-scoped-vibe-check-publicly.md)与[完整发布 Gate](../../docs/decisions/require-complete-project-gate-evidence-before-public-release.md)。

## Goals / Non-Goals

目标是交付可安装、可追溯且升级影响清楚的 0.0.2，并使计划更新不干扰冻结发布。

本次不重审已发布 0.0.1 的 tarball，不替下游项目执行迁移回归，也不扩大产品能力或恢复其它 Change。新版自身的契约、正式包与分发验收仍由项目负责。

## Decisions

### Intended Change

本次沿用 [Package release 固定约定](../../docs/tooling/package-release.md#固定发布约定)，输入按“既定规则、已取得事实、待取得事实”区分；[evidence](evidence.md)保存观察结果，不从历史授权推导本次权限。

| 输入 | 本次选择与状态 |
| --- | --- |
| npm package / version | `@zxyycom/vibe-check@0.0.2` 已确定。 |
| 发布分支 | `release-0-0-2` 已创建并检出；唯一活跃实现工作区为 `/workspace/vibe-check`。 |
| source commit S | 从发布分支冻结的干净提交；待发布输入闭合后选定，与 Plan `baseCommit` 分开记录。 |
| npm dist-tag | 按固定约定使用 `latest`，本次已确认。 |
| access / 发布产物 | 按既定规则使用 public access，并发布同一受验 tarball；不是本次重新选择的事项。 |
| 认证执行方式 | 按固定约定由发布者本地交互式发布并完成 2FA；本次已确认，publisher 仍须当次核验。 |
| Git tag | `v0.0.2` 指向 S，在发布与分发验证成功后按授权创建、推送。 |
| 发布说明 | 以[变更日志](../../docs/changelog.md)统一承接可追溯净变化与必要升级调整；已确定随包交付，由 README 直链；不默认新增 GitHub Release 渠道。 |

执行顺序：

1. **准备说明与发布分支（1.1、1.1.1、1.1.2、1.1.3、0.2、0.3、0.4 → 2.1）。** 完成历史重审与 changelog 的交叉审阅，确认当次发布输入；在获授权后把本次准备改动带到 `release-0-0-2` 的唯一活跃实现工作区。先核对已有改动归属，保留无关工作，不以在 main 提交作为迁移前提。
2. **冻结源码（1.2）。** 发布准备可按授权分次提交；在当次输入与审阅闭合后，选定干净提交 S，建立独立 detached 发布工作区。把两个工作区位置、S 与当次输入记入 Change 工作区的 evidence；随后只在发布工作区运行正式命令。
3. **正式验收（1.3 → 2.2）。** 执行 `bun run package:release:prepare -- --version 0.0.2 --tag latest`，取得 receipt；用 `bun run package:release:verify -- --receipt <receipt-path>` 驱动同一正式包的完整 `--all` Gate 和 external consumer 验收。
4. **发布（2.3 → 1.4 → 2.4）。** 临发布前复核冻结源码、receipt/bytes、registry 与 publisher，取得精确发布授权；发布同一 tarball，然后核对 registry integrity 并完成精确版本安装验收。
5. **交接与合入（1.5 → 1.6 → 2.5）。** 交付升级说明与非敏感证据，将 Git 标签绑定 S，按授权将发布分支修正及交接合回 main。合入涉及当前 main 的新增内容或冲突时，按受影响 owner 验证；合并提交不改写已发布源码身份。

### Resulting Impacts

**两份工作区的责任。** 发布分支的实现工作区拥有当前 Plan、升级说明和人工证据；冻结工作区拥有 S 的精确源码与正式构建/验证输出。冻结期间仍可在实现工作区更新 tasks/evidence。

发布工作区的 tracked files、index 和 HEAD 保持 S；依赖与构建输出按既有入口在该工作区准备。若改动要进入本次发布，在发布分支提交后重新选定 S 并重新 prepare/verify，不修改 receipt 来接受漂移。

**证据与清理。** evidence 记录工作区路径、S、receipt/tarball 路径与 digest、Gate/分发结果、源码标签及合入提交。artifact/log 按 [固定归档规则](../../docs/tooling/package-release.md#固定归档位置与保存内容)在释放冻结工作区前保存并核对；摘要保存在发布分支。Change 工作区中的后续证据提交与 main 合并提交分别标识。

**发布说明。** changelog 按主题说明净变化、必要升级调整及可复核的提交来源，区分产品与维护者影响。按提交信息定位实际 diff 与当初文档，并与旧版和当前 owner 核对；合并提交不重复计为功能，计划、回退和未采用实验不自动成为发布变化。历史文件仅从 Git 读取，不恢复旧目录，也不覆盖前轮调查认识。

changelog 随包提供，共用 README 入口、包内链接、指纹及精确 bytes 验收。当前使用单文件，未来按阅读负担再评估版本目录。

**发布映射。** `docs/package-documents.json` 集中声明 Markdown、Check 指南和 machine 材料的源文件与包内路径。
三类材料共享路径校验、fingerprint 和交付映射；示例投影、Check 导出覆盖、machine 内容验证分别保持原责任。
代码从本次 repository root 读取配置；配置 bytes 与所引用源文件均参与 fingerprint。本次保持现有目标路径，
配置不自动改写链接，也不扩大为 Product runtime 配置。验证必须证明异根读取、映射生效、非法配置拒绝及包材料一致性。

**验证范围。** 历史重审支撑 changelog 的完整性与准确性，新版行为由现有目标测试和完整 Gate 证明，正式包由同产物 consumer 与分发安装证明；有具体缺口才补证据。公开承诺和内部职责按[文档影响审查](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)独立复核。

**授权。** 发布准备改动的归属核对、分支创建与切换已按本次授权完成。本次 Git 提交已获授权；后续冻结工作区、额外提交、tag/push、合并、联网/认证和 npm publish 仍按对应步骤取得授权；token、OTP 和认证配置不写入仓库或日志。

## Risks / Trade-offs

- 独立工作区隔离文件，不替代精确 S、receipt 与 tarball 的一致性核验；两个工作区使用各自的受控输出。
- main 可以继续集成；合回时新增内容或冲突不能改变 `v0.0.2` 指向，也不能冒充该版本已验产物。
- 网络/认证失败不表示版本不存在；发布结果不确定时先核对精确 registry 状态，不盲目重试发布或移动标签。
- 发布后分发验证失败时保留当前证据和工作区并处理故障，暂停正常合入/清理。
- Plan 结构检查与流程文档落地不证明分支已创建、正式包已构建或版本已发布。

## Open Questions

发布方式与归档规则已确定；尚需选定正式 S、取得 receipt 和临发布事实。各实际 Git、网络/认证、发布与清理动作的当次授权，分别在执行前取得。
