# Proposal

在独立发布分支交付 `@zxyycom/vibe-check@0.0.2`，以冻结源码工作区验收正式包，发布验证后将修正与交接合回 main。执行设计见 [design](design.md)，实际进度见 [tasks](tasks.md)。

## Why

本版的产品与性能研究输入已经收束，升级差异和说明初稿已经形成。接下来需要把持续更新的发布 Change 与冻结源码分开，沿用既有正式构建、验收和 npm 发布机制完成交付。

## Outcome

消费者可以安装精确的 0.0.2 并取得升级说明；正式源码提交、tarball、receipt、完整 Gate、registry integrity 和安装验证可以相互核对。发布修正与交接材料在发布验证后合回 main。

## Scope

### Intended Change

- 从选定集成基线建立 `release-0-0-2` 分支，承接本 Change 及准备改动；main 保持开发集成主线。
- 从 `v0.0.1` 到选定源码的 Git log、实际 diff 与形成时文档重新核对净变化，以随包的 `docs/changelog.md` 说明改了什么及消费者如何调整。
- 将随包文档源文件与包内路径的映射集中到 docs 下的 JSON，由构建与验收读取；保持本次已有发布路径。
- 选定干净提交 S，在独立冻结工作区构建、验收和发布同一正式包；计划与证据在 Change 工作区继续维护。
- 完成当次授权的 npm 发布、分发验证、源码标签及发布后的合入交接。

### Resulting Impacts

- 通用分支规则由 [Change 协调](../../docs/governance/change-coordination.md#worktree-与合入规则)拥有，双工作区与精确发布流程由 [Package release](../../docs/tooling/package-release.md)拥有；本 Plan 只记录本次选择和进度。
- 已有输入包括 Gate 配置 `b30477b6`、虚拟平台 `f7e9f353`、算法不采用结论 `fd8923c8` 及最终对照 `c0af9fff`。它们解除研究前置，不形成新的 Product 算法或性能承诺。
- 本次准备改动由发布分支的实现工作区维护并按授权提交；后续冻结工作区的源码、index、HEAD 与受控输出保持对应同一 receipt。
- changelog 按主题记录净变化与必要升级调整，单列维护者变化，并用相关提交索引提供追溯入口。项目负责新版公开契约和正式包质量，下游负责自身适配与回归。
- changelog 进入显式 Markdown 材料清单、README 入口和包内链接验收；Change 只保留计划与发布证据。当前采用单文件，后续按实际阅读负担评估版本目录。
- Markdown、Check 指南和 machine 材料共用 JSON 映射，分别保留示例投影、导出覆盖和内容规则；配置与所引用源文件参与 fingerprint，并验证异根读取和包内目标。
- 当次发布选择、授权与观察记录在 [evidence](evidence.md)；持久交接完成后，才可按独立授权清理 Change 或释放工作区。

## Success Criteria

1. changelog 经 Git 历史和当前 owner 交叉审阅：覆盖主要净变化、修复、破坏式变化及必要调整，不把已有能力、过程性改动或未采用的实验写成新增发布能力。
2. 发布 Change 和冻结源码位于独立工作区；receipt 绑定 S 与正式 0.0.2 tarball，同产物完整 Gate 和 external consumer 验收通过。
3. 临发布前 source、artifact、registry version/dist-tag 与 publisher 核验有效，且具有该正式包的当次发布授权。
4. registry 的版本和 integrity 与已验产物一致；从 registry 安装精确版本后的类型、入口、文档用法与代表性运行验收通过。
5. 随包文档映射在 docs 中集中维护，目标路径、精确 bytes、链接与 installed consumer 验收通过。
6. 用户可取得升级说明，非敏感证据可恢复；`v0.0.2` 指向 S，发布修正与交接已按授权合回 main，合入结果通过受影响验证。

## Affected Owners

- [Package release](../../docs/tooling/package-release.md) 与 `scripts/package/release/**`：双工作区、正式 source、构建、receipt 和同产物验收。
- [文档材料](../../docs/tooling/documentation.md)与文档构建/验收：JSON 映射、示例投影、Check 指南及 machine 材料。
- [Project Gate](../../docs/tooling/project-gate.md) 与 `scripts/project/gate/run.ts`：完整 Gate 和 aggregate，沿用现有验收入口。
- [文档导航](../../docs/navigation.md#随包用户材料)指向的公开 owner：产品契约、声明、schema 与使用示例。
- [Change 协调](../../docs/governance/change-coordination.md)：分支、实施基线与跨 Change 合入；本 Change 承接当次发布输入、说明和证据。
