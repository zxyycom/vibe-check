# Tasks

本清单跟踪 0.0.2 发布。按 [design](design.md#intended-change)交错准备、验收与执行；计划及证据在 Change 工作区维护，正式构建与发布使用冻结工作区。checkbox 只表达已有证据，不产生操作授权。

## Readiness

- [x] 0.1 核对上游交接：`b30477b6`、`f7e9f353`、`fd8923c8` 和 `c0af9fff` 已进入 Plan 基线；末轮启发式候选未采用，发布不再等待该性能研究。Owner：发布准备。
- [x] 0.2 已确认按 [固定发布约定](../../docs/tooling/package-release.md#固定发布约定)使用 `latest`、本地交互式 2FA、public access 和同一受验 tarball；publisher 当次核验仍由 2.3 完成。Owner：用户与发布执行者。
- [x] 0.3 已确定 changelog 随包提供，artifact/log 按 [固定归档规则](../../docs/tooling/package-release.md#固定归档位置与保存内容)保存；Git 标签、合入和后续清理分别取得当次授权。Owner：用户与发布执行者。
- [x] 0.4 已按授权核对 21 个准备变更文件，创建并切换到 `release-0-0-2`，复用 `/workspace/vibe-check` 为唯一活跃实现工作区；切换前后内容与暂存状态一致，其他 worktree 未动。依据见 [evidence](evidence.md#分支准备与归属)。Owner：发布执行者。

## Implementation

- [x] 1.1 基于 `v0.0.1` → `c0af9fff` 的可追溯源码差异完成[调查](../../docs/investigations/audit-0-0-2-upgrade-differences.md)和升级说明初稿，为 [changelog](../../docs/changelog.md) 与 [evidence](evidence.md)提供输入。最终审阅由 2.1 承接。Owner：升级说明。
- [x] 1.1.1 由 Terra 审阅区间内 213 个可达提交的目录与信息，按主题核对实际 diff 与部分形成时文档，形成可追溯[变更日志](../../docs/changelog.md)；区分最终净变化、旧有能力、维护者变化与未采用实验，已通过非实施代理定向复核。依据见 [evidence](evidence.md#历史重审)。Owner：发布说明与独立审查者。
- [x] 1.1.2 将 changelog 移至 `docs/changelog.md`，通过 README 和显式材料清单随包提供；验证包内链接、精确 bytes、目标测试及完整 Gate，并由非实施代理复核用户文档与内部职责。Owner：package documentation 与独立审查者。
- [x] 1.1.3 将三类随包文档映射集中到 `docs/package-documents.json`，构建与验收按本次 root 读取；完成异根、映射、非法输入、fingerprint 和完整包验收，同步 owner、Decision 与独立审查。Owner：package documentation 与独立审查者。
- [x] 1.1.4 将正常发布选项和归档规则固定到长期 owner 与 Decision，同步当前发布输入并完成独立语义复核。Owner：发布流程。
- [ ] 1.2 在 0.2、0.3、0.4 与 2.1 完成后，按授权从已提交的发布准备材料选定干净 S，并建立固定 S 的独立 detached 发布工作区；在 Change evidence 记录工作区及 S。Owner：发布执行者。
- [ ] 1.3 在冻结工作区执行正式 prepare，核对 0.0.2 receipt、tarball、S、fingerprint、inventory 与 integrity；记录可定位的非敏感结果。Owner：package release。
- [ ] 1.4 在 2.2、2.3 通过并取得精确发布授权后，按已确认机制发布同一 tarball，保存实际结果。Owner：发布执行者。
- [ ] 1.5 在 2.4 通过后交付升级说明，持久保存发布 evidence 与所需 artifact/log；按授权创建、推送指向 S 的 `v0.0.2`。Owner：发布执行者。
- [ ] 1.6 在发布与分发验证成功、1.5 交接完成后，按授权将发布修正和交接材料合回 main；记录合入提交，运行受影响验证，保持标签指向 S。Owner：发布集成。

## Verification

- [x] 2.1 冻结前由非实施代理从实际源码差异反查 changelog 与受影响用户/内部材料，复核最终版本内容与发布状态，并验证随包链接可达性，运行相关文档检查；仅对具体行为证据缺口补目标测试。Owner：独立审查者与行为 owner。
- [ ] 2.2 在冻结工作区对 1.3 的 receipt 运行 `bun run package:release:verify -- --receipt <receipt-path>`，确认同一正式包的完整 `--all` Gate 与 external consumer 验收通过，保存日志定位。Owner：package / Gate。
- [ ] 2.3 临发布前重新核对冻结 S、receipt/tarball freshness，并在获授权后核验 registry version/dist-tag 与 publisher authority，确认精确外部写入授权。Owner：发布执行者。
- [ ] 2.4 核对 registry 0.0.2 的 dist-tag 与 integrity，隔离安装精确版本并验证 root import、类型、README 用法与代表性 Check；记录实际环境和结果。Owner：分发验证。
- [ ] 2.5 核对升级说明可取得、证据可恢复、`v0.0.2` 指向 S、main 合入及验证已完成。之后仅在独立授权与各自门禁满足时清理 Change 或释放工作区/分支。Owner：交付审查。
