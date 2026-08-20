# Design

本 Design 让 public API reference 跟随 TypeScript declarations，让端到端使用指南跟随 npm artifact，并把仓库 owner、candidate packaging 与发布验收组织为单向可核对关系。

## Context

当前事实与长期方向如下：

- [`docs/configuration.md`](../../docs/configuration.md) 是 Project Definition authoring 与 invocation 的稳定 owner；[`docs/output.md`](../../docs/output.md) 拥有 structured result、machine artifacts 与 readable output。
- [`release-one-versioned-npm-product-unit`](../../docs/decisions/release-one-versioned-npm-product-unit.md) 要求同一 package version 交付 runtime、公共 declarations 与明确承诺的 package materials。
- [`support-bun-as-the-package-host`](../../docs/decisions/support-bun-as-the-package-host.md)、[`use-programmatic-api-as-product-entry`](../../docs/decisions/use-programmatic-api-as-product-entry.md) 和 [`keep-prestable-package-releases-on-0-0-x`](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md) 分别约束 Bun-only host、API-only entry 与 `0.0.x` compatibility wording。
- [`src/product/public-contract/current.ts`](../../src/product/public-contract/current.ts) 拥有当前 public symbol inventory；[`scripts/package-candidate/entry.ts`](../../scripts/package-candidate/entry.ts) 投影 exact runtime/type exports。
- [`src/product/README.md`](../../src/product/README.md) 只保存 initial lift provenance，并明确不是 current runtime/API owner；它不能被误作 package consumer guide，也不应在本 Change 中静默改写为另一种用途。
- candidate manifest 当前 `files` 只包含 `index.mjs` 与 `types`；staging audit拒绝除此之外的普通文件。生成的 declarations 会保留 source JSDoc，但多数公共 interface/function 目前没有完整 API comment。
- API 内容建设属于本 Change；[`publish-public-api-only-npm-package`](../publish-public-api-only-npm-package/) 只负责核对版本、registry、legal/release metadata 与 exact artifact，不在不可逆 release 阶段临时 author README/install guidance。

[`complete-typed-record-authoring`](../complete-typed-record-authoring/) 会改变 Record authoring 的 LSP surface，[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 会改变首版 result/output surface；两者都已纳入首次公开 package closure，必须先完成并提供 declaration/result evidence，再冻结本 Change 的 Records、RunResult、effects 与 presentation examples/comments。

## Goals / Non-Goals

### Goals

- 为 `defineConfig`、`defineCheck`、`inherit`、`run`、三个默认 Check values 与全部 current public types提供能够独立用于 LSP hover 的 JSDoc。
- 明确 `defineCheck` 只是 inference helper、唯一 execution callback、options snapshot、Record reporting、comparison/cache/signal、terminal result branches、effects 与 RunResult narrowing。
- 建立一个仓库权威 source，并在 candidate staging 中以 npm 识别的 `README.md` 随附端到端 API guide。
- 更新 candidate manifest/files allowlist、artifact audit、receipt fingerprint 与 isolated consumer，使 README 和 declarations 与 runtime 属于同一 exact tarball。
- 提供项目内简短文档入口，指向稳定 owner和 packaged guide；不复制一份内容不同的“仓库版 API”。
- 审计现有 README/导航引用，保留 `src/product/README.md` 的 provenance 责任，并确保项目维护者不会误入历史说明寻找 public API。
- 写出 documentation handoff，供 publish Change 核对 exact artifact、guide inventory 与 consumer acceptance。

### Non-Goals

- 不访问 npm registry、不执行 publish、不选择 publisher/version或写 release notes。
- 不在本 Change 决定 MIT copyright holder/year；LICENSE/legal completion仍由 release准备及其长期 Decision约束。
- 不增加 public CLI、配置发现、plugin API、Node.js host承诺或额外 package export。
- 不用文档掩盖尚未实现的 typed Record或 result presentation；只记录进入本 Change 验收基线的当前 public contract。
- 不把所有内部 architecture、private scanner protocol、Gate profile/tag 或 repository process helper复制进 npm guide。

## Decisions

以下是 Draft 的建议性 documentation architecture；它不授权 public surface 或 package inventory 的实现变化。

### 1. JSDoc 是 symbol-local API reference

每个 public function、value 和 named type 的 source declaration拥有独立可读的 summary、关键参数/fields、返回/分支、失败或边界说明，并在需要时给最小 example或链接语义。comments 位于 declaration emit实际消费的 source owner，禁止在 generated `.d.ts` 中手工维护第二份注释。

JSDoc 不复制长篇教程；它必须让 consumer 在只看到 hover 的情况下正确使用当前 symbol，并知道何时进入 packaged guide。

### 2. Package README 是安装后的端到端 guide

仓库维护一份明确 source，candidate build 将其逐字节复制为 package-root `README.md`。README 至少包含：

1. 精确安装与 Bun host要求；
2. API-only import 和最小 `defineConfig` + `run`；
3. 默认 Checks 与 native object composition；
4. custom `defineCheck`、typed options 和 Records；
5. policy、effects 与 result branch handling；
6. artifacts/console 的边界；
7. `0.0.x` 精确锁版本建议和不支持范围。

README 不声称 registry package 已存在，直到 publish Change 使用 exact release version；candidate 阶段使用可安装 tarball示例或不含虚假 registry成功陈述的命令。

### 3. 仓库 owner、guide 与 examples 单向核对

稳定契约仍由 `docs/configuration.md`、`docs/output.md`、相关 Decision和 public-contract inventory拥有。package guide 是面向 consumer 的版本化投影，不成为第二个字段/schema owner。文档验证应检查 public symbol names、examples 和关键链接/片段与 current owner一致，而不是复制整个 owner正文。

项目内只增加简短导航：维护者从 docs navigation进入 Configuration/Output；Gate添加者从 Script Tooling 进入 native Check/process helper 路径；外部使用者从 package README进入。三者按消费者分工，不形成互相漂移的完整副本。

### 4. Documentation 是 exact package material

candidate manifest `files`、staging allowlist、artifact audit 与 expected inventory显式包含 `README.md`。input fingerprint包含 guide source和所有会改变 emitted public JSDoc/declarations 的 source；匹配 receipt才可复用。

isolated consumer 从 packed artifact读取 README、校验 required sections/public names，并继续执行 runtime import与 declaration typecheck。只检查 repository source文件不能证明 npm consumer收到文档。

### 5. Publish 只完成 release-specific material

本 Change 写出 `package-api-documentation-handoff.md`，记录 guide source、tarball path/digest、README bytes、declaration comments inventory、isolated consumer证据和重新验证条件。publish Change消费该 handoff，只补 registry/live version、legal identity、release notes与明确外部授权；不得在发布阶段重写 API semantics。

## Risks / Trade-offs

- **双文档漂移：** README 是 consumer projection而非 stable field owner；必须用 public inventory和代表性 examples核对，而不是人工维护另一份完整规范。
- **JSDoc 体积：** 过长 comments会扩大 declaration与 hover噪声；每个 symbol只保留局部使用所需内容，教程进入 README。
- **形成顺序：** typed Record或其它首发 public API仍变化时，过早冻结 guide会反复返工；Readiness必须核对 active API Changes。
- **虚假可用性：** candidate guide不能把尚未发布的 registry版本写成已可安装事实；publish后再绑定 exact public version。
- **package inventory：** README 加入 tarball会改变 candidate digest和 cutover 时的 Gate behavior evidence；binding 仍成立，但 Gate optimization / publish 必须按 handoff 条件刷新 exact-artifact evidence。
- **敏感或内部内容：** examples与comments不得暴露 repository-only paths、private process adapters、credentials或未承诺 host。

## Open Questions

- package README 的仓库权威 source 应为根 `README.md`，还是专门的 `docs/package-api-guide.md` 再由 candidate build复制？前者便于仓库入口与 npm 共用，后者避免当前内部仓库首页被预发布安装说明主导；形成 Plan 前应以实际维护/packaging路径选择一个单一 source。`src/product/README.md` 的 provenance 责任排除在候选之外。
