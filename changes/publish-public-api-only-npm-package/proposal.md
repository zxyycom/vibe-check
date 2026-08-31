# Proposal

本 Plan 将一个带正式版本号、由完整 Project Gate 验证过的 API-only `@zxyycom/vibe-check` tarball，在分段授权下发布到 npm，并以 registry exact-version 安装验收结束交付。

当前进度、下一 checkpoint 与授权边界以 [`tasks.md`](tasks.md#current-checkpoint) 为准；当次 registry、artifact、Gate、publish 与 post-install 事实以 [`release-evidence.md`](release-evidence.md#reading-contract) 为准。下文 Outcome 和 Success Criteria 描述 Change 完成态，不证明这些结果现在已经发生。

## Why

Plan baseline 的 package tooling 已能生成并安装 `0.0.0-local.<fingerprint>` candidate，但当时 manifest 没有 Vibe Check 自身的 MIT legal text、正式 Bun host 声明或 release version owner。后续本地实施补上 closed release manifest/legal contract 和 formal receipt/Gate 入口，并让 unscoped `vibe-check@0.0.1` tarball 通过 same-artifact full Gate；首次 publish 仍被 npm 以近似既有 `vibecheck` 为由明确拒绝。该 `E403` 证明 unscoped identity 不可按本 Plan 继续使用，也使对应 artifact、receipt 和 Gate 只能作为失败尝试证据。

用户随后选择公开的个人 scope identity `@zxyycom/vibe-check`。这一调整不改变产品显示名、GitHub repository、API surface、MIT、Bun host 或 `0.0.x` 方向，但会改变 generated manifest、安装/import specifier、installed path、packed filename、receipt identity 与全部 consumer evidence。仓库根 `package.json` 始终是 `private: true` 的开发工具 manifest，不能作为公开发布输入；scoped release 必须从新的 clean reviewed commit 完整重建和复验。

本地 candidate、isolated consumer 与 full Project Gate 可以证明某个 tarball 的 runtime、declarations、documentation 和核心消费方式，却不能证明 npm 上的名称控制权、publisher authentication、目标版本可用性、dist-tag、公开访问级别或 publish 后的 registry bytes。npm 的 name/version 一经发布不能再次使用；网络错误后盲目重试、从目录重新打包或在验收后修改 README/manifest，都可能把未经验证的 bytes 写入不可逆的公共状态。

因此公开发布需要独立 Plan：先补齐正式 release artifact 与 legal/host contract，让同一 exact tarball 通过完整 Gate，再分别取得 registry preflight、publish 和 post-publication acceptance 的当次授权。`add-html-link-validation`、`add-network-link-validation`、`add-secret-detection` 与 `port-lizard-function-metrics-to-typescript` 是后置方向，不进入首次公开 release。

## Outcome

完成后，普通 Bun consumer 能从 npm registry 以 exact version 安装公开的 user-scoped `@zxyycom/vibe-check@0.0.<patch>`。Registry 中的该版本与 release receipt、full Project Gate 和本地审核绑定同一 tarball digest，并共同交付：

- 仅从 package root 导入的程序化 runtime 与 TypeScript declarations，不含 CLI、`bin` 或 subpath API；
- JSON、JSON Schema、Markdown Link 与 maintenance reminders 四项首发 Check 能力，以及当前已承诺的 package documentation 与 machine materials；
- 明确的 Bun host 下限、production dependency closure、MIT manifest 字段和经核实权利人/年份的 MIT legal text；
- 不含 credential 的 registry publication 与发布后 isolated-consumer evidence。

## Scope

### Intended Change

- 在 `scripts/package/**` 建立正式 release preparation/verification 路径：显式接收未占用的 `0.0.<patch>` 与 dist-tag，复用现有 artifact builder/audit，生成一次 exact tarball 和 closed release receipt；默认 fingerprint local candidate 继续服务开发期，不被当作正式版本。
- 让正式 artifact manifest 明确 `@zxyycom/vibe-check` identity、MIT license、经验证的 Bun engine、公开 npm registry/access、repository provenance、唯一 root export、allowlisted files 与完整 runtime dependencies；打包匹配的 Vibe Check `LICENSE`，继续保留实际随包分发的第三方 legal material。
- 让 full Project Gate 显式消费 release receipt 指向的同一 tarball、staging 与 digest，不在 Gate 内重建另一个 local-version candidate；release tarball 通过 Gate 后保持 byte-for-byte 不变。
- 在获得单独的 registry-read authorization 后核验 publisher/name/version/tag/mechanism；在最终授权中逐项写明 registry、public access、exact version、tag、absolute tarball path、digest 与 publish mechanism，只发布该 tarball，禁止发布仓库根目录或 unpacked directory。
- 发布成功后，在新的授权下读取 exact-version registry metadata，比较 registry SHA-512 integrity，并从 ancestry-external 临时目录显式运行 `npm install @zxyycom/vibe-check@<exact-version>`，再重复 types、documentation 与 Bun runtime acceptance。
- 同步 README、release notes、script-tooling/current-delivery owner 和直接相关 Decision alignment；保存不含 token、OTP、`.npmrc` 内容或 credential-derived value 的 release evidence。

### Resulting Impacts

- `scripts/package/**`、根 package scripts、artifact/receipt audits 与 `scripts/project/gate/**` 需要区分 local candidate 和 formal release artifact，同时共享一套 runtime、declaration、documentation、inventory 与 dependency owner。
- Package name、MIT legal text、Bun host 下限、repository metadata、consumer installation guidance 或正式版本发生变化后，旧 local receipt、tarball digest、documentation projection 与 Gate evidence 均失效，必须重新生成并对同一 release tarball 复验。
- Registry/authentication reads、Trusted Publishing 或 staged-publish 配置、`npm publish`、dist-tag/access 修改、post-publish metadata read 与 registry install 都是外部操作；Plan stage、Decision alignment、checkbox 或本地 Gate 成功均不授予这些权限。
- 公开版本失败后不能自动 unpublish、deprecate、重发或切换 package name/version；任何补救都是新的外部写入，需要先报告状态并取得精确授权。

## Success Criteria

- Formal tarball 的 manifest 使用 user-scoped `@zxyycom/vibe-check@0.0.<patch>`、`license: "MIT"`、经验证的 Bun engine、显式 public registry/access、唯一 `exports["."]`，且没有 `private`、`bin`、CLI 或 subpath exports；own MIT `LICENSE`、README/docs、declarations/runtime/source materials、machine materials、依赖和第三方 legal material 均通过 allowlist audit。
- Release receipt 将 clean Git commit、input fingerprint、exact version/tag、artifact path、file inventory、SHA-256 与 registry-compatible SHA-512 integrity 绑定在一起；receipt 和 evidence 不保存 credential 或依赖临时绝对 consumer path 作为长期身份。
- `bun run verify:vibe-check-workspace:full` 对 receipt 指向的同一 formal tarball 完成 candidate lifecycle、artifact、types、documentation、runtime 与真实 repository Gate 验收；所有届时已知 repository-quality findings 都有可审计处置，不以 non-blocking status 代替 release disposition。
- Publish 前的最终授权与实际 command 完全匹配 registry、public access、exact version、tag、tarball 和 digest；命令不从 `.`、workspace manifest、unpacked directory 或重新生成的 tarball 发布，输出不泄露 credential。
- 发布后的 exact registry metadata/integrity 与本地 receipt 一致；全新 consumer 用 npm 安装该版本，并在 Bun host 下通过 public import/type、package documentation 和 runtime acceptance。若使用 provenance，验证结果与 source commit/repository 对应；未使用时不伪称已有 provenance。
- README 以常规 `npm install @zxyycom/vibe-check` 服务 package consumer，并明确完整 scoped import、`0.0.x` 兼容、Bun-only host 与非目标边界；release evidence 和交付导航在发布后记录 exact public version。直接相关 active Decisions 只在当前事实和验证完整后审阅 alignment。

## Affected Owners

- `scripts/package/**`、`scripts/package/command.ts`、根 `package.json` scripts：formal release artifact、manifest/legal projection、receipt、digest、inventory 与本地 release workflow。
- `scripts/project/gate/**` 与 `scripts/project/gate/run.ts`：从显式 release receipt 消费同一 exact artifact，并提供 full Gate evidence。
- `README.md`、package-projected `docs/**`、`LICENSE`、release notes 与 `docs/script-tooling.md`：consumer installation/host/legal 说明及 workflow owner。
- `src/index.ts`、`scripts/package/public-api-inventory.ts` 与 package artifact audits：保持 API-only root export、四项首发 Check 和当前 public inventory 不变。
- `docs/decisions/{release-one-versioned-npm-product-unit,publish-user-scoped-vibe-check-publicly,license-package-under-mit,support-bun-as-the-package-host,keep-prestable-package-releases-on-0-0-x,require-complete-project-gate-evidence-before-public-release,require-known-repository-quality-remediation-before-public-release}.md`：长期方向与完成后的 alignment 审阅；被替代的 unscoped identity 只保留为演进历史。
- `docs/testing/cases/**`、package/Gate tests 与 Test Evidence catalog：formal artifact、authorization boundary、manifest/legal、same-artifact Gate 和 registry consumer 的证明责任。
