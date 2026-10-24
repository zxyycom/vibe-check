# Package Release

准备正式版本时读取本文：它拥有固定发布约定、双工作区、同一 tarball 验收与证据保存。产物格式复用 [Package artifact](package-artifact.md)；开发期候选包与缓存见 [Package lifecycle](package-lifecycle.md)，不能作为正式发布证据。

## 固定发布约定

正常发布沿用下表的固定约定。变更长期流程时先修订本文和对应 Decision；
确需单次例外时，在执行前取得明确授权并记录原因、范围与恢复方式，不从失败或历史操作推导新默认值。

| 项目 | 固定约定 |
| --- | --- |
| package / registry / access | 公开发布 `@zxyycom/vibe-check` 到 canonical npm registry；精确值由 [release manifest](../../scripts/package/artifact/release-manifest.json)拥有。 |
| dist-tag | `latest`；正式 prepare 显式传入 `--tag latest`，publish 使用同一 tag。 |
| 发布产物 | 发布通过正式 receipt 与完整验收的同一份本地 tarball，不从源码目录再次打包。 |
| 发布与认证方式 | 发布者在本地交互式终端执行发布并完成 2FA；认证步骤不放入 Gate，也不采集 token、OTP 或认证配置。 |
| 发布说明 | 随包的 [changelog](../changelog.md) 与 README 入口；不另设 GitHub Release 渠道。 |
| 对外文档复核 | 按[发布前复核](#发布前对外文档复核)取得适用于最终正式包的独立语义结论。 |
| Git 交接 | 发布及分发验证成功后，版本标签绑定冻结提交 S，再按授权合回 main。 |
| 证据保存 | 使用下节[固定归档位置](#固定归档位置与保存内容)，保留原始产物及可核对摘要。 |

版本号、冻结提交 S、receipt/digest、实际 publisher、registry 观察和授权结果仍是每次发布产生的事实。
沿用上述规则无需再次确认方案；实际外部写入、worktree 操作及清理仍须取得对应授权。

## 发布身份与授权边界

每次发布先建立 active release Change，其 current evidence 引用上述固定约定，记录解析后的输入、实际产物与 registry observations。
历史 release 记录只作形成时证据，不能证明当前版本可用、账号有权限或本次写入已获授权。

`package:release:prepare` 只接受显式的 canonical positive `0.0.<patch>` 与保守 lowercase tag，要求 repository root、index 和 worktree 位于同一 clean `HEAD`。它不复用 local receipt，也不把 `0.0.0-local.*` 改名。从 current evidence 取得输入后执行：

```sh
bun run package:release:prepare -- --version <selected-version> --tag latest
```

这些输入只选择本地 build identity，不证明 registry availability 或 publish 授权；public access 由 version 投影后的 staging manifest 的 `publishConfig` 闭合。prepare/verify 均不查询 registry、核验 publisher authority 或授权状态，也不执行外部 publish mechanism。

## 发布前对外文档复核

每次正式发布，执行者都须将[对外文档使用者审查](documentation.md#对外文档使用者审查)纳入 release Change 的任务与验收。
审查方法和完成条件由文档 owner 定义；本节负责发布时序与最终包确认。

1. **准备期审查。** 对实际候选包的全部用户文档与对外 JSDoc 完成独立审查，在冻结源码前尽早修正问题；范围包含本版本未修改的内容。
2. **正式包确认。** 从冻结提交 S 形成正式 tarball 后，用 receipt、摘要和包内实际材料确认身份。
   独立审查者核对正式包清单、内容及相关行为与已审对象的一致性，再确认可复用的阅读结论。
   版本、changelog、声明或其它材料有差异时复核差异及关联阅读路径；影响不明时扩大审查。
3. **发布前判定。** 在 release Change 的 current evidence 保存 `Manual CR:`、正式包身份与独立结论。
   只有满足文档 owner 的完成条件才可进入发布；覆盖不足、必要核对未完成、独立复核缺失或关键问题未解决时阻断发布。

执行者分别核对语义结论与机械结果：现有 CLI 不读取审查记录，prepare/verify 或 Gate 成功不表示文档审查通过。
确认后若需修正发布输入，按[冻结与验收流程](#发布工作区冻结源与交接)重建并复核新包；记录始终在 Change 实现工作区维护。

## 发布工作区、冻结源与交接

正式发布有两个职责分离的 worktree，不能以同一 checkout 中的暂存记录代替：

1. **准备。** Change 实现 worktree 在无前缀发布分支（例如 `release-0-0-2`）准备 Plan、实现修正、升级说明与非敏感证据，并开展[对外文档复核](#发布前对外文档复核)。该工作区承接持续记录，正式构建使用下一步的冻结工作区；`main` 保持开发集成线。
2. **冻结。** 选定 clean source commit `S` 后，建立独立 detached 发布 worktree 并固定在 `S`。prepare 前须满足[发布身份要求](#发布身份与授权边界)中的同一 clean `HEAD` 条件。
3. **验收。** 在 frozen worktree 从 `S` prepare 正式 tarball 与 receipt，运行 `bun run package:release:verify -- --receipt <receipt-path>`，由该命令接线 `--all --release-receipt <path>`，将完整 routine Gate 及 installed types/docs/runtime acceptance 绑定到同一 tarball；日常无 receipt 的 all 不包含 types，不能替代本步骤；同时完成[正式包文档确认](#发布前对外文档复核)。
4. **发布与标记。** 同一 tarball 的完整验收、对外文档独立语义复核、临发布 freshness/registry/authority 核验和精确外部写入授权均满足后，才按已确认机制发布。发布及分发验证成功后，Git `v<selected-version>` tag 指向 `S`。
5. **合入。** 发布修正、Plan 和非敏感证据可在 Change 实现 worktree 持续维护，不使 detached worktree drift；只有正式发布及分发验证成功后，才按授权和受影响验证合回 `main`。任何拟纳入发布的 source 或 packaged-material 变更都须重选 clean commit、重新建立冻结 worktree、prepare 和完整验收。

释放冻结 worktree 前，按下节保存证据并完成字节核对；Change evidence 记录实际归档路径与结果，非敏感摘要继续在实现 worktree 维护。

此规则只规定 source、artifact 和 Git 时序；它不授予创建或切换分支/worktree、提交、合并、tag、push、publish 或其它外部写入的权限。Change 协调的分支命名与一般 worktree 规则见 [Change coordination](../governance/change-coordination.md#worktree-与合入规则)。

## 固定归档位置与保存内容

在所属仓库中用 `git rev-parse --path-format=absolute --git-common-dir` 取得公共 Git 目录。
归档槽位固定为 `<git-common-dir>/vibe-check/releases/<version>/<receipt-sha256>/`，其中摘要为原始 receipt 文件的完整 SHA-256。
所有 worktree 共用该位置；它位于临时发布 worktree 之外，不随该 worktree、分支或 Change 的清理删除。

每个槽位保留以下材料，路径均相对该槽位：

| 材料 | 保存方式 |
| --- | --- |
| tarball 与 receipt | 按原工作区相对路径保存到 `build/artifacts/` 和 `build/releases/`，原始 bytes 不变。 |
| 正式 Gate 日志 | 保留对应 `.log/project-gate/<invocation-id>/` 目录结构，供定位具体 Check 和同包验收结果。 |
| `evidence/<sha256>.md` | 保存当次 Change evidence 的非敏感快照，文件名为快照 bytes 的 SHA-256；包含版本、S、产物摘要、日志索引、对外文档审查覆盖与独立结论、发布及分发结果、Git 标签与交接提交。 |

正式验收后先保存 tarball、receipt 和 Gate 证据，发布及交接后新增包含后续结果的 evidence 快照。复制前检查材料不含认证秘密，
禁止归档 `.npmrc`、token、OTP 或登录会话 transcript；若日志含敏感内容，停止归档和工作区清理并单独处理。
复制后逐文件核对摘要，确认 receipt 的 SHA-256 与槽位一致，tarball 的 SHA-256、SRI 和版本与 receipt 记录一致，才记录归档完成。
同槽位已有文件只能在 bytes 相同时复用，内容冲突时停止；新的 receipt 使用新的摘要槽位，不覆盖旧产物。

归档是人工交接步骤，prepare/verify 不会自动执行。receipt 内路径保持原样；归档目录不是另一个可直接运行正式 verify 的工作区。
再次验收仍须恢复固定 S 的工作区及 receipt 约定的受控路径，按原入口重验。归档在仓库存续期间保留，清理须独立授权；
删除整个仓库前必须先迁移并核对归档。这是本地持久保存约定，不表示已有跨机器备份。

## 受控路径与收据内容

Prepare 清理的范围仅是 `build/release-package/`、该 version 的 `build/artifacts/zxyycom-vibe-check-<version>.tgz`、`build/releases/zxyycom-vibe-check-<version>.release.json` 与 `.cache/vibe-check/package-release/`；其中 release staging/cache 与默认 `build/package/`、`.cache/vibe-check/package-candidate/` 隔离，versioned tarball root 由 artifact builder 共用。

Receipt writer 在写入前要求 artifact、staging 与 receipt path 都匹配这些 owned paths，并重新核对 artifact SHA-256；失败不会把任意 caller path 写成 release evidence。

Release receipt 只保存 repository-relative canonical paths，并闭合 source commit、package input fingerprint、version/tag、ordered tar inventory、SHA-256、SHA-512 SRI、manifest/legal/README identity；它不保存 token、OTP、`.npmrc`、publisher secret、临时 consumer 或 absolute checkout path。

prepare 在 build 前后复核 clean commit/fingerprint，写入 receipt 后再按该 receipt 重验；任一 source 或 byte drift 都失败。receipt 通过 current verifier 才构成完整 formal preparation 结果；它本身不证明 Gate 或 registry 状态，仍需按上节分别验收。

发现 drift 时停止沿用旧验收，不得手改 receipt 接受差异。通过受控 prepare 重新形成 receipt，并对新 receipt 重跑同一 tarball 的完整验收；拟纳入发布的 source 或 packaged-material 变更须先按上节重新冻结。
