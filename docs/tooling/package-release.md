# Package Release

准备正式版本时读取本文：它拥有发布身份、双工作区、同一 tarball 验收、receipt 与交接时序。产物格式复用 [Package artifact](package-artifact.md)；开发期候选包与缓存见 [Package lifecycle](package-lifecycle.md)，不能作为正式发布证据。

## 发布身份与授权边界

每次发布先建立 active release Change，由其 current evidence 保存本次 exact version/tag/access/mechanism 与 registry observations；历史 release 记录不是本次选择、版本可用性或授权的依据，本文不保存当次输入。

`package:release:prepare` 只接受显式的 canonical positive `0.0.<patch>` 与保守 lowercase tag，要求 repository root、index 和 worktree 位于同一 clean `HEAD`。它不复用 local receipt，也不把 `0.0.0-local.*` 改名。从 current evidence 取得输入后执行：

```sh
bun run package:release:prepare -- --version <selected-version> --tag <selected-tag>
```

这些输入只选择本地 build identity，不证明 registry availability 或 publish 授权；public access 由 version 投影后的 staging manifest 的 `publishConfig` 闭合。prepare/verify 均不查询 registry、核验 publisher authority 或授权状态，也不执行外部 publish mechanism。

## 发布工作区、冻结源与交接

正式发布有两个职责分离的 worktree，不能以同一 checkout 中的暂存记录代替：

1. **准备。** Change 实现 worktree 在无前缀发布分支（例如 `release-0-0-2`）准备 Plan、实现修正、升级说明与非敏感证据，可以持续记录工作，但不是正式构建输入；`main` 保持开发集成线。
2. **冻结。** 选定 clean source commit `S` 后，建立独立 detached 发布 worktree 并固定在 `S`。prepare 前仍须满足上节的同一 clean `HEAD` 条件，不以工作区隔离放宽校验。
3. **验收。** 在 frozen worktree 从 `S` prepare 正式 tarball 与 receipt，再运行 `bun run package:release:verify -- --receipt <receipt-path>`，将完整 `--all` Gate 与 external-consumer acceptance 绑定到同一 tarball。local candidate、开发期 Gate 或重新打包的 tarball 都不能替代。
4. **发布与标记。** 同一 tarball 的完整验收、临发布 freshness/registry/authority 核验和精确外部写入授权均满足后，才按已确认机制发布。发布及分发验证成功后，Git `v<selected-version>` tag 才指向 `S`，不能指向后续 `main` 或合并提交。
5. **合入。** 发布修正、Plan 和非敏感证据可在 Change 实现 worktree 持续维护，不使 detached worktree drift；只有正式发布及分发验证成功后，才按授权和受影响验证合回 `main`。任何拟纳入发布的 source 或 packaged-material 变更都须重选 clean commit、重新建立冻结 worktree、prepare 和完整验收。

释放冻结 worktree 前，在当次 Change 确认的位置持久保存所需 artifact 和日志；具体位置与时效结果由 Change evidence 承接，非敏感摘要继续在实现 worktree 维护。

此规则只规定 source、artifact 和 Git 时序；它不授予创建或切换分支/worktree、提交、合并、tag、push、publish 或其它外部写入的权限。Change 协调的分支命名与一般 worktree 规则见 [Change coordination](../governance/change-coordination.md#worktree-与合入规则)。

## 受控路径与收据内容

Prepare 清理的范围仅是 `build/release-package/`、该 version 的 `build/artifacts/zxyycom-vibe-check-<version>.tgz`、`build/releases/zxyycom-vibe-check-<version>.release.json` 与 `.cache/vibe-check/package-release/`；其中 release staging/cache 与默认 `build/package/`、`.cache/vibe-check/package-candidate/` 隔离，versioned tarball root 由 artifact builder 共用。

Receipt writer 在写入前要求 artifact、staging 与 receipt path 都匹配这些 owned paths，并重新核对 artifact SHA-256；失败不会把任意 caller path 写成 release evidence。

Release receipt 只保存 repository-relative canonical paths，并闭合 source commit、package input fingerprint、version/tag、ordered tar inventory、SHA-256、SHA-512 SRI、manifest/legal/README identity；它不保存 token、OTP、`.npmrc`、publisher secret、临时 consumer 或 absolute checkout path。

prepare 在 build 前后复核 clean commit/fingerprint，写入 receipt 后再按该 receipt 重验；任一 source 或 byte drift 都失败。receipt 通过 current verifier 才构成完整 formal preparation 结果；它本身不证明 Gate 或 registry 状态，仍需按上节分别验收。

发现 drift 时停止沿用旧验收，不得手改 receipt 接受差异。通过受控 prepare 重新形成 receipt，并对新 receipt 重跑同一 tarball 的完整验收；拟纳入发布的 source 或 packaged-material 变更须先按上节重新冻结。
