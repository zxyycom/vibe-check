# Design

本 Design 把稳定 API 语义、JSDoc 叙述、README 叙述和可验证示例分配给不同 owner，再通过一个确定性的 documentation operation 形成 JSDoc 与 README 消费投影。目标不是建立通用文档生成器，而是让 package consumer 实际拿到的说明、代码与 exact candidate 可以一起验证。

## Context

### 当前事实与权威来源

| 信息 | 权威来源 | 本 Change 如何使用 |
| --- | --- | --- |
| Public symbol names | [`src/product/public-contract/current.ts`](../../src/product/public-contract/current.ts) | 当前为四个 operations、三个 default values、十八个 named type roots；驱动 coverage、tests 与 handoff，不增加 exports。 |
| Declaration 内容 | 实际 declaration source owners 与 [`scripts/package-candidate/entry.ts`](../../scripts/package-candidate/entry.ts) | JSDoc 写入 source，由 declaration emit 保留；不手改 `.d.ts`。 |
| Project/Check/Record/dependency/Run 语义 | [`docs/configuration.md`](../../docs/configuration.md) | 为 JSDoc 与 guide 提供稳定 authoring/invocation 语义。 |
| Result/output/effect 语义 | [`docs/output.md`](../../docs/output.md) | 为 JSDoc 与 guide 提供稳定结果、展示与 trust boundary。 |
| Candidate lifecycle | `scripts/package-candidate/**` 与 [`docs/script-tooling.md`](../../docs/script-tooling.md) | 负责 fingerprint、staging、pack、receipt、isolated install 与 exact-artifact audit。 |
| Historical provenance | [`src/product/README.md`](../../src/product/README.md) | 继续只保存 initial-lift provenance，不承担 current API guide。 |
| 交付顺序 | [`vibe-check-package-and-gate-delivery.md`](../vibe-check-package-and-gate-delivery.md) | Documentation handoff 先于 matching Gate optimization；publish 最后且另行授权。 |

Package unit、Bun host、API-only entry 与 `0.0.x` 方向分别来自已有长期 Decision。这些 Decision 当前的 `active + unaligned` 状态表达未来交付方向，不证明 registry package、公开版本或宿主承诺已经生效。因此 README 必须区分“当前 local candidate 可验证”与“尚未授权的 registry release”。

当前根目录没有 `README.md`，public declaration comments 也不完整。JSDoc 与 package guide 采用中文作为主语言，使当前维护者可以直接审核语义；API identifiers、TypeScript literals、status/reason codes 与专有名保持原文，不维护逐段双语镜像。

### 消费契约

| 消费者实际拿到的内容 | 必须完成的任务 |
| --- | --- |
| 编辑器/LSP 读取 emitted declarations 中的 JSDoc | 理解单个 symbol 的用途、输入、关键字段、默认值、返回分支和局部边界；必要时跳转到相邻 public symbol。 |
| Installed-package consumer 读取 package `README.md` 与 declarations | 判断 host、可用性和不支持范围；完成从安装、最小运行到 Check authoring、dependency data 和结果处理的跨 symbol 流程。 |
| Repository maintainer 或实施 AI 读取本 Plan、owners、template、examples、registry 与 tests | 找到唯一编辑入口，修改后重新生成并验证投影，不从 generated README、`.d.ts` 或 tarball 反向恢复契约。 |
| Gate/publish implementer 读取 handoff 与 candidate receipt | 判断文档与 artifact 是否仍 matching，以及哪类变化要求重新准备证据。 |

### 内容流向

```text
稳定语义 owners + current public inventory
             |                 |
             v                 v
   source JSDoc prose    README narrative template
             \                 /
              \               /
      verified TypeScript examples + typed closed registry
                       |
                       v
          documentation operation
             |                 |
             v                 v
  source JSDoc @example      root README.md
             |                 |
             +--------+--------+
                      v
       declaration emit + package candidate
                      |
                      v
       tarball / isolated install / handoff
```

箭头只表示从 owner 到消费投影。Generated README、generated JSDoc example block、emitted declarations、tarball 和 handoff 都不能反向成为事实源。

## Goals / Non-Goals

### Goals

- 让 exact public inventory 及必要 supporting declaration closure 在中文 hover 中局部可用。
- 让 package README 按 consumer task 说明跨 symbol 使用流程、失败边界与不支持范围。
- 让需要验证的代码先成为 `.ts` source，再按目标注入 JSDoc、README 或两者；不要求两个投影拥有相同示例集合。
- 让 root README、declaration comments 与 examples 成为 exact candidate 的可审计组成部分。
- 让后续 Gate optimization 与 publish 能用 handoff 判断 artifact 是否仍 matching。

### Non-Goals

- 不改变 Product semantics、public exports 或 package entry。
- 不建立 public CLI/bin、argv、Node.js host、configuration discovery、plugin API、subpath export 或 compatibility alias。
- 不查询 registry、读取 credential、选择 publisher/version/copyright，或执行 publish。
- 不把 repository architecture、private scanner、Gate profile/tag 或维护流程写进 consumer guide。
- 不建立通用 Markdown/source rewriting framework，也不冻结整段中文 prose。
- 不在 JSDoc、README template 或 generated README 中手写需要 typecheck/runtime 证明的 TypeScript code block。
- 不把可执行安装命令伪装成未验证的 fenced snippet；本 Change 的安装命令使用 inline code，新增可执行 shell block 前必须先增加独立 source 与对应 evidence contract。

## Decisions

### Intended Change

#### 1. 文档层分别拥有叙述，代码层共享可验证 payload

JSDoc 与 README 只有一项真实公约数：需要展示并声明证据的 TypeScript code payload。其余责任保持分层：

| 层 | Owner | 共享或局部责任 |
| --- | --- | --- |
| 稳定 API 语义 | Configuration、Output、public inventory、declaration sources | 唯一 contract source；JSDoc/README 只能摘要或投影。 |
| Symbol-local 叙述 | declaration source 上的 JSDoc prose | 只服务 hover；不复制跨 symbol 教程。 |
| Guide 叙述 | `docs/package-readme.template.md` | 只服务 package onboarding 与跨 symbol flow；不承接 symbol reference 全集。 |
| 可验证代码 | `docs/examples/package-api/*.ts` | JSDoc/README code block 的唯一 source；完整文件在 installed package boundary 上接受验证。 |
| 投影关系 | `scripts/docs/package-api-docs/registry.ts` | 以 typed discriminated union 为每个 source 或命名 region 记录中文标题、evidence mode 与一个或多个 JSDoc/README target。 |
| Generated output | source JSDoc example block、root `README.md` | 不接受手工编辑；由 operation 写入或检查。 |

如果把全部示例强制放进 README，会让 guide 被 symbol-local 用例膨胀；如果让 JSDoc 与 README 各自手写代码，又会产生不可验证的副本。因此 registry 以稳定、可观察的 target 区分两个投影：同一 source/region 可以只进入 JSDoc、只进入 README，或同时进入两者。

#### 2. JSDoc coverage 由 public inventory 与使用闭包驱动

实施从 `CURRENT_PUBLIC_CONTRACT` 取得 root names，再定位每个 root 的 declaration owner。每个 public function、value 和 type 至少提供一句可独立理解的中文 summary；签名不能表达且会改变正确使用的参数责任、字段含义、默认值、阶段、返回分支或边界再按需补充。

`CheckExecutionContext`、`RunControls`、`RunResult` 等 roots 可达的 supporting declarations/fields，即使不是 package-root named exports，只要 consumer 必须读取它们才能正确使用 root，也补充局部说明；这不改变其 export 身份。Package-private helpers、长篇教程和完整跨 symbol 流程不因相邻而进入 JSDoc。

JSDoc 使用以下 closed policy。除 summary 外，所有 tag 都是可选项；没有对应语义时不添加。

| Tag | 何时使用 | 本 Change 的限制 |
| --- | --- | --- |
| Summary（无 tag） | 每个 public root 与必要 supporting declaration | 直接说明用途，不复述名称或 TypeScript type。 |
| `@remarks` | summary 放不下的关键阶段、约束或边界 | 保持局部、可扫读，不写教程。 |
| `@param` | 参数责任、默认、validation 时机无法由签名表达 | 不重复参数 type。 |
| `@typeParam` | generic 参数承接 options、final data 或 item 等业务关系 | 不用 `@template` 重复声明 TS generic。 |
| `@returns` | Promise/union 分支、对象身份或副作用边界需要解释 | 不复述显式 return type。 |
| `@example <中文标题>` | 局部代码显著降低误用 | block 必须由 registry 指向的 source/region 注入并带 evidence mode；可以只投影到 JSDoc。 |
| `@see` / `{@link}` | 需要跳到相邻 public symbol | 只链接 installed declaration 中可解析的 symbol，不链接 repository-only path。 |
| `@defaultValue` | Product 确实应用稳定默认值的 field/property | caller 决定或 release 决定的值不标默认。 |
| `@packageDocumentation` | candidate declaration entry 的首个 package comment | 只概述 package、Bun/API-only 边界和 README 入口。 |
| `@throws` | 有明确、预期且稳定的 thrown exception contract | 当前 operations 的 expected failure 主要进入 result；无新证据时不使用。 |
| `@deprecated` | 已进入受支持弃用期且有替代项 | 当前 prestable hard-cut surface 无此状态，不使用。 |

不使用 `@type`、`@typedef`、`@property`、`@template`、`@readonly`、`@public`、`@private`、`@internal`、`@module`、`@author`、`@version`、`@since` 或 `@todo` 来重复 TypeScript/export/release/legal/task 信息。每个实际采用的 tag 都必须通过 declaration emit 与当前 language-service fixture 证明保留且可读；生成的 `.d.ts` 只用于验证，不是编辑入口。

#### 3. README 按 installed consumer 的任务组织

`docs/package-readme.template.md` 拥有中文叙述、非可执行 inline code 和 closed placeholders。生成的 root `README.md` 依次覆盖：

1. 产品用途、Bun-only host、API-only entry 和当前发布可用性；
2. local candidate 使用方式，以及未来 `0.0.x` registry release 的 exact-pin 原则；
3. 最小 `defineConfig` + `run`；
4. default Checks、native object composition 与 `inherit`；
5. `defineCheck`、typed options、execution context、Records、messages 与 visibility；
6. `dependsOn`、producer `parseData` 与 `dependencies.get(checkId)` 的 typed final-data flow；
7. Run Controls、aggregation、effects 与 output/presentation 边界；
8. `RunResult.kind` narrowing，以及 cancellation/planning/execution/effect failures；
9. 不支持的 public CLI、Node.js、plugin/subpath surface 与 prestable compatibility boundary。

核心 consumer flow 在 installed README 中给足，不依赖 package 中不存在的 repository-relative docs。Template 不得把未发生的 publish 写成事实；release Change 只能在获得授权后更新 version、registry、legal 与 release-specific links，再重新生成 documentation-complete candidate，不能直接改 generated README 或借机改写 API semantics。

#### 4. Typed registry 以明确 target 生成两个投影

`scripts/docs/package-api-docs/registry.ts` 导出只读 `PACKAGE_API_EXAMPLE_PROJECTIONS`。每项使用 typed discriminated union 记录：

- 唯一 `id`、`sourcePath`、可选 `regionId` 和中文 `title`；
- `evidence: "typecheck" | "runtime"`；`runtime` 表示完整 source 既通过 installed-package typecheck，也在 isolated fixture 中运行；
- 一个或多个 `{ kind: "readme", placeholderId }` 或 `{ kind: "jsdoc", sourcePath, declarationName }` target。

首版 inventory 固定为：

| Projection ID | Source/region | Evidence | Target |
| --- | --- | --- | --- |
| `quick-start` | `quick-start.ts` 的 `quick-start` region | `runtime` | README placeholder `quick-start` |
| `custom-check-definition` | `custom-check.ts` 的 `custom-check-definition` region | `runtime` | `defineCheck` declaration JSDoc |
| `custom-check-run` | `custom-check.ts` 的 `custom-check-run` region | `runtime` | README placeholder `custom-check` |
| `typed-dependency` | `typed-dependency.ts` 的 `typed-dependency` region | `runtime` | README placeholder `typed-dependency` |

这个 inventory 让 README 获得三条 onboarding 主线，同时让 `defineCheck` hover 只获得局部 authoring example；JSDoc example 不会因为存在而自动进入 README。

定位与 payload 规则固定如下：

1. Template placeholder 独占一行并使用 `<!-- package-api-example:<placeholderId> -->`。每个 README target 必须命中且只命中一个 placeholder，operation 用带稳定 language fence 的 payload替换该行。
2. Example region 使用 `// #region package-api-example:<regionId>` 与 `// #endregion package-api-example:<regionId>`；region ID 在全部 example sources 中唯一，projection payload 不包含 boundary markers。
3. JSDoc target 由 repository-relative `sourcePath + declarationName` 唯一定位。Target declaration 上的全部 `@example` tags 由 operation 拥有并连续放在 comment 尾部；出现 registry 未声明的 manual `@example`、目标缺失或定位不唯一时失败，不增加额外 source marker/tag。
4. 三个完整 `.ts` source 都是 standalone example program：只从 package root 导入 current public names，在 isolated candidate fixture 中先 typecheck 再运行。Region 只决定展示 payload，runtime evidence由其完整 source提供。
5. Source 使用 UTF-8、LF 且恰有一个 trailing LF。Operation 不格式化或改写 payload；README fence 内 bytes 与 region相同，JSDoc block 去除 comment prefixes 后与 region相同。
6. README fence 由 operation 确定性选择且不能与 payload 冲突。包含 `*/` 的 payload 不能原样进入 block comment；应缩小合法 region 或改成 README-only，不能转义成另一段未经验证的代码。
7. Duplicate、unknown、missing 或 unused source/region/target、缺失 evidence、未闭合 marker 和 stale output 一律失败。
8. 首版 executable fenced blocks 只接受 registry 管理的 TypeScript payload。非可执行输出/数据必须明确标为示意并由结构检查约束；新增 shell 或其它可执行语言前先扩展 source type、runner、evidence mode 和本 Plan。

#### 5. Operation 负责生成，CLI 与 candidate 只是适配器

`scripts/docs/package-api-docs/render.ts` 导出 `renderPackageApiDocumentation({ repositoryRoot })`。它读取 template、registry、examples 与 JSDoc source，在内存中返回 `{ readme: { path, content }, jsdocSources: readonly { path, content }[] }`；导入 module 不读取 `process.argv`、不写 console/files、不设置 exit code，调用 operation 也不写文件。

`scripts/docs/package-api-docs/index.ts` 只承担命令行适配：解析 `--write | --check`、调用 operation，并把结果映射为文件写入、diagnostic 和 exit status：

- `--write` 只把 operation 返回的完整 root README 与 source JSDoc contents写入对应路径；
- `--check` 只比较 expected 与 checked-in projections，不写文件；
- docs validation 使用 CLI 的 `--check`。

Candidate preparation 不再“运行文档命令再解析输出”，而是在同一个 Bun process 中 import 并调用 `renderPackageApiDocumentation({ repositoryRoot })`。它先确认 checked-in source JSDoc 与 root README 等于 expected output，再进行 declaration emit，并把 expected README content写入 staging；这样复用的是同一生成逻辑，而不是 CLI 的 argv、console 或 exit-code 行为。

#### 6. Documentation inputs 进入 candidate identity 与审计闭包

Candidate 必须纳入并验证以下边界：

- **Input fingerprint：** template、examples、registry、documentation operation 和影响 declaration comments 的 Product sources均为 inputs；任一变化拒绝旧 receipt。
- **Staging 与 manifest：** 允许且要求 `package.json`、`index.mjs`、`types/**/*.d.ts`、`README.md`。
- **Tar inventory：** 明确要求 `package/README.md`。
- **Projection audit：** operation expected output、checked-in root README、source/emitted JSDoc example payload、staged/tar/installed README 保持对应的 byte equality。
- **Installed consumer：** 从实际安装目录读取 README，并使用同一 example sources 完成 typecheck/runtime acceptance。

优先复用现有 receipt 的 `inputFingerprint`、artifact digest 与 files inventory。只有测试证明这些字段无法绑定 documentation projections 时，才演进 receipt contract；不预先建立第二套 receipt schema。

#### 7. 测试验证结构、映射与消费结果，不冻结 prose

测试从 exact public inventory 与 consumer tasks 推导，验证：

- 每个 public root 在 emitted declaration 中存在且保留有意义的 doc comment；必要 supporting declarations 有字段级说明，但没有变成额外 root exports；
- 实际 tags 属于 closed policy，`@packageDocumentation` 位于 entry 的正确位置，emit/LSP fixture 能呈现所用 tags；
- template sections、placeholder inventory、typed registry 与 source/region/target/evidence inventory 闭合；
- generated JSDoc/README payload 与 example source/region 一致，修改任一 documentation input 会使 `--check` 或 receipt reuse 失败；
- 三个 examples 面向 installed package typecheck，声明 runtime evidence 的程序实际运行；
- candidate/tar/installed projections 与 expected output 一致，current runtime acceptance 不回归。

`scripts/docs/package-api-docs/render.test.ts` 负责 registry、region、target、rendering 和 emit/LSP fixture；`scripts/docs/package-api-docs/index.test.ts` 只负责 CLI `--write | --check` 行为。测试不复制完整自然语言或代码作为另一份 expected truth。Case 优先复用 `AUX-PACKAGE-CANDIDATE-001` 和 `WB-PROJECT-DEFINITION-001`；只有出现独立证明目的才新增 Case。

#### 8. Handoff 绑定 exact artifact

全部验证通过后，`package-api-documentation-handoff.md` 记录：

- source revision、public inventory、JSDoc policy/coverage；
- template、example source/region、projection target/evidence inventory、operation；
- generated JSDoc/README path、hash、byte length与 installed comparison；
- candidate version、input fingerprint、artifact path、SHA-256、tar inventory；
- isolated consumer、typecheck、tests、docs validation 与 required Gate 结果；
- 使 handoff 失效的 documentation、declaration、inventory、candidate builder、manifest、receipt 或 consumer-acceptance 变化。

Handoff 只证明其记录的 exact artifact。文件存在、Change stage 或 checklist 状态不能替代 matching receipt 和重新验证。

### Resulting Impacts

| Change | 必须处理的影响 | 主要验证 |
| --- | --- | --- |
| Public sources 增加中文 JSDoc | Declaration 内容和大小变化，但 runtime behavior 与 root exports 不变 | public-contract test、emit/LSP audit、installed typecheck |
| Verified examples 投影到 JSDoc/README | 代码 owner 统一，两个消费者的示例集合仍可不同 | registry/operation tests、payload byte comparison、installed example acceptance |
| Generated README 进入 candidate | Fingerprint、allowlist、tar inventory、digest 与 receipt reuse 变化 | candidate lifecycle、stale receipt、tar/installed byte audit |
| Documentation operation 被 docs 与 candidate 共用 | CLI side effects 与生成逻辑分离；两个入口必须得到同一 expected output | operation unit test、CLI `--check`、candidate preparation test |
| Documentation handoff 写出 | 下游必须消费同一 artifact，任一输入变化会失效 | handoff review、matching fingerprint/digest、required Gate |

## Risks / Trade-offs

- **语义漂移：** JSDoc/README 是消费说明而非 stable contract。冲突时沿 owner 图修正上游，不在 generated output 局部补丁。
- **生成复杂度：** 新增 template、registry 与 operation。范围只覆盖 closed placeholders、approved JSDoc example blocks、deterministic rendering 与 drift check，不发展通用文档框架。
- **Hover 噪声：** Supporting closure 可能扩大注释量。只保留 symbol-local、会改变正确使用的信息；跨 symbol flow 留在 README。
- **README 膨胀：** 不是每个 JSDoc example 都进入 README；registry target 以 consumer task 决定，README 只保留 onboarding 主线需要的示例。
- **浅层 coverage：** 只检查 `/**` 不足以证明可用。Inventory/adjacency/tag/consumer-task tests 与代表性 AI/人类语义审阅共同验收。
- **虚假发布事实：** Pre-release template 必须明确 local candidate 状态；registry/version wording 只能由获得授权的 release Change 更新并重建 artifact。
- **Artifact drift：** README/JSDoc 修改会改变 candidate identity。Fingerprint、receipt、byte audit 与 handoff 共同拒绝旧证据。
- **内部信息泄露：** Comments/examples 不得包含 private adapter、repository-only path、credential、secret URL 或未承诺 host；以 isolated package 可见内容审阅。
- **范围升级：** 新增 public export、改变 Product semantics、声称新的 host/registry 事实、增加 executable language 或采用 closed policy 外的 JSDoc tag，都必须先更新对应 owner 与本 Plan，不得作为局部实现细节吸收。

## Open Questions

无。
