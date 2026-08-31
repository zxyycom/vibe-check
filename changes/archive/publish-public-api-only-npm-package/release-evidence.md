# Release Evidence

本文保存 `publish-public-api-only-npm-package` 的脱敏 release evidence。它将正式 artifact、same-artifact Gate、npm registry publication、exact-version consumer acceptance 和 Git tag 绑定到同一个 `@zxyycom/vibe-check@0.0.1`，不保存 credential、OTP、`.npmrc` 内容或临时 consumer identity，也不授权未来 registry 写入。

## Reading contract

| Question | Authoritative owner |
| --- | --- |
| 本次 Change 的 Outcome、流程边界与失败规则是什么 | [`proposal.md`](proposal.md) 与 [`design.md`](design.md) |
| 本次任务是否完成、哪些证据支持 checkbox | [`tasks.md`](tasks.md#current-checkpoint) 与本文 |
| Consumer 当前如何安装和运行 package | [`README.md`](../../README.md#分发与兼容范围) |
| 正式 tarball 的完整 inventory 与 closed contract 是什么 | `build/releases/zxyycom-vibe-check-0.0.1.release.json`；本文另保存其 identity 与 digest，build output 本身不进入 Git |
| npm 上实际公开了什么 | 本文记录的 exact registry metadata/integrity 与无凭据 exact-version install result |

下文的时间只描述对应时点的观察。`0.0.1` version bytes 不可复用；`latest`、账号状态和未来版本仍可能变化，不能从本证据推断新的 publish 授权。

## Current scoped selection

本 Change 的最终 scoped selection 是已发布的 public `@zxyycom/vibe-check@0.0.1`、dist-tag `latest`、canonical npm registry 和 local direct publish with interactive 2FA。它已经从拟议输入变成下文可复核的完成事实，但不会成为后续 release 的默认版本、tag、mechanism 或授权。

## Published scoped release

### Formal artifact and same-artifact Gate

Formal preparation 从 clean commit `2a454f0a6162afebb6729a4cfef969594d045c10` 构建并 receipted 以下唯一发布输入：

| Evidence | Result |
| --- | --- |
| Package / tag | `@zxyycom/vibe-check@0.0.1` / `latest` |
| Input fingerprint | `315a2ef74ea8d7d9d7f35a52e92145b22fee479334263bff5d34837b7fa109d3` |
| Artifact path | `build/artifacts/zxyycom-vibe-check-0.0.1.tgz` |
| Receipt path | `build/releases/zxyycom-vibe-check-0.0.1.release.json` |
| Receipt SHA-256 | `3679c71f1a2f2127f3405f705e945c734addd0e50942d4a13dc7a72534199012` |
| Tar inventory | 767 files |
| Tarball SHA-256 | `8ada3a1ec1e9902a535c43066da850763ad9d5acb3716ee2c37861715163b4cf` |
| Tarball SHA-512 SRI | `sha512-GNSLTtkivOOovj4JHoj1tYdOzsqXqVjbnwoevZwgLqmu4DzKsAm0YD9hCkllavsEpMcHptADwVstZ9uekNDdQw==` |
| Closed contract | public scoped identity、MIT 与 own/third-party legal texts、Bun `>=1.3.14`、canonical repository、public registry/access、唯一 root export、README/docs/declarations/runtime/source/machine materials 与 production dependency closure |

`2026-08-31T05-38-37.690Z-2331992-1983c3e6-9fc1-4ed2-a9ca-adaa012de304` Project Gate invocation 以 `release-receipt` 为 candidate source，重新核验 receipt、两种 tarball digest、staging/packed bytes 和 ancestry-external types/documentation/runtime acceptance，36/36 Checks passed。Repository-quality 没有 duplicate、function 或 Markdown finding；唯一 file-metric finding 是必须保持 bytes 不变的 historical v2 schema，已有 active Decision-backed waiver。

本地归档审阅再次核对现存 tarball SHA-256 与 receipt 一致。后续 repository-only commits 只调整 GitHub metadata、Git hook 和内部文档，没有改写、重建或重新发布 `0.0.1` bytes。

### Publication and registry acceptance

用户按最终选择使用 local direct publish with interactive 2FA，将上述 receipted tarball 公开发布到 `https://registry.npmjs.org/`，显式使用 public access 和 `latest`；未使用 staged publish、Trusted Publishing 或 provenance。Registry 记录 `0.0.1` 的发布时间为 `2026-08-31T05:40:46.431Z`。

发布后以及本次归档审阅的无凭据 public metadata read 均确认：

| Registry field | Observed value |
| --- | --- |
| Name / version | `@zxyycom/vibe-check@0.0.1` |
| `dist-tags.latest` | `0.0.1` |
| `dist.integrity` | `sha512-GNSLTtkivOOovj4JHoj1tYdOzsqXqVjbnwoevZwgLqmu4DzKsAm0YD9hCkllavsEpMcHptADwVstZ9uekNDdQw==` |
| `dist.shasum` | `f9ff8823047f6297626081ee3ca4c22b38b9fd47` |
| Public tarball | `https://registry.npmjs.org/@zxyycom/vibe-check/-/vibe-check-0.0.1.tgz` |
| Manifest contract | `license: MIT`、`engines.bun: ">=1.3.14"`、canonical GitHub repository、root-only import/types export |

Registry `dist.integrity` 与 formal receipt 的 SHA-512 SRI 完全一致，因此 registry version 与 same-artifact Gate 消费的是同一 tarball bytes。Public metadata 最初经历短暂 propagation delay；执行者只重复只读 exact-version 查询，没有重试 publish、修改 dist-tag/access、unpublish 或发布替代版本。

### Registry consumer acceptance

2026-08-31 的归档审阅在 repository ancestry 外创建全新临时 consumer，并使用常规 npm installer 对 exact release 执行：

```text
npm install --ignore-scripts --no-audit --no-fund --package-lock=false \
  --registry=https://registry.npmjs.org/ \
  @zxyycom/vibe-check@0.0.1
```

该进程使用 `NPM_CONFIG_USERCONFIG=/dev/null`，移除常见 npm token environment inputs，不使用 workspace link、local tarball 或 ancestor `node_modules`。安装后 public entry 解析到临时 consumer 内的 `node_modules/@zxyycom/vibe-check/index.mjs`，并通过与 local formal consumer 相同的三类验收：

- types：全部 public type/runtime imports、package examples 和 declaration QuickInfo 通过 pinned TypeScript 验收；
- documentation：README、Check guides、machine materials、runtime examples 与 machine Definition example 和 current owner 一致并可执行；
- runtime：Bun host 下的 public API、package-provided tools 与结构化 Run evidence 验收通过。

临时 consumer 已清理，只保留上述脱敏结果。README 继续推荐面向普通消费者的 `npm install @zxyycom/vibe-check`；exact version 和额外 flags 只属于 release verification。

### Git release identity

Annotated tag `v0.0.1` 指向 formal receipt 的 source commit `2a454f0a6162afebb6729a4cfef969594d045c10`，本地与 `origin` 的 peeled target 一致。该 tag 只绑定源码版本，不建立第二个分发载体；npm package 是本次 release unit，因此没有创建重复的 GitHub Release。

## Rejected unscoped attempt

### Registry and account observations

用户完成本机 npm web login 后，曾授权 unscoped selection 的只读 preflight。形成时工具链为 Node `26.7.0`、npm `11.19.0`，registry ping、`npm whoami` 和 verified-email/2FA status 检查通过；只记录 publisher name `zxyycom` 与 2FA mode `auth-and-writes`，没有读取或保存 email address、token、OTP 或 `.npmrc` 内容。最终 unscoped recheck 时间为 `2026-08-31T03:40:31Z`，当时 exact metadata 为 not-found；该时效观察没有保留名称，也不能绕过 npm 的近似名称保护或证明 scoped selection。

在 scoped release 之前，unscoped `vibe-check@0.0.1` formal tarball 曾通过自身 same-artifact Gate，但 npm publish 返回 HTTP `403`，明确指出名称与既有 `vibecheck` 过于相似。该 PUT 被明确拒绝，不是结果不确定；没有产生 registry version、dist-tag 或 Git tag。

用户随后选择 `@zxyycom/vibe-check`。Package identity、README/import、artifact path 和 receipt 都是 formal inputs，因此旧 unscoped artifact 被删除且从未复用；scoped `0.0.1` 从 commit `2a454f0` 独立重建、验证和发布。不得把 unscoped digest、preflight 或授权恢复为未来输入。

## Completion boundary

本证据证明 `@zxyycom/vibe-check@0.0.1` 的 formal artifact、full Gate、public registry bytes、exact npm install、types/documentation/runtime consumer acceptance 和 source tag 已闭合。它不证明未来 `latest` 指向、后续 Bun/npm 版本兼容性、账号配置或下一版本可发布，也不授权任何 registry、tag 或 GitHub 外部写入。
