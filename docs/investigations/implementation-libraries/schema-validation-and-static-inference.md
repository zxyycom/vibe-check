# TypeScript Schema 与运行时校验框架调查

## 调查信息
- 核心问题: Vibe Check 的 typed Record 是否应以第三方 Schema 框架统一 runtime validation 与 static inference；若应采用，TypeBox、Zod、Valibot、ArkType、Ajv 及 Standard Schema / Standard JSON Schema 各自适合什么边界？
- 状态: 已结束
- 最新报告时间: 2026-08-21T02:22:26Z

## 调查报告

### Record schema authoring 的框架选择、替代项与互操作边界
- 形成时间: 2026-08-21T02:22:26Z

#### 形成时背景

`complete-typed-record-authoring` Change 正在补齐 `defineCheck(...)` 中 literal `recordTypes` 到
`records.report(...)` / `records.reportReference(...)` 的静态类型投影。其当前范围明确保持普通
`Check` 对象、既有 Record runtime validation、Core、policy 与 machine v3 不变；TypeScript 类型
不因通过编译而替代 runtime authority。

当前 `RecordTypeDefinition` 是一个产品自有 descriptor：每个 field 只有
`boolean | integer | number | string` value vocabulary、`required`、`identityFields` 和可选 policy。
Definition/Core validation 还验证 closed object、stable ID grammar、canonical order、重复项、identity
field 必须是已声明 required field、policy operand 与 field 的关系、owning Check、recordId 重算、
duplicate/late write 等。也就是说，字段 shape 是其中一层，跨字段与生命周期不变量仍是产品语义。

仓库在本轮开始时已在 machine v3 schema / artifact validation 使用 `typebox@1.3.9` 的
`Type.*`、`Type.Static`、`Value.Check` 和 `Value.Errors`；`ajv@8.20.0` 只用于独立的 machine
contract-material test support。编码规范把 TypeBox 列为“需要 runtime Schema、外部数据解析和静态
类型派生”时的预置能力。根 `package.json` 当前把两者都列为 devDependency；这不是未来公开 package
依赖分类已经确定的证据。

本轮先用调查报告 CLI 的 `list` 发现全部既有主题，并审阅
`implementation-libraries` 下三个报告。它们只讨论函数/数据结构、模式匹配/状态机和 Result/Option；
没有同一核心问题的既有 schema 或 validation-library 调查。因此本轮新建本主题，而非追加历史报告。

#### 调查目的

回答以下问题，并为后续是否改变 Record authoring/runtime contract 提供可复核输入：

1. 在 Vibe Check 的 closed Record catalog、runtime trust boundary、static inference 与可发布 JSON
   Schema 需求下，TypeBox 是否有独立于“仓库已经安装”的适配证据。
2. 对比 TypeBox、Zod、Valibot、ArkType、Ajv 的功能适配、公共 authoring 耦合、runtime validation、
   static inference、JSON Schema/可检查性、动态 schema、错误模型、依赖/打包代理指标、维护成熟度和热度。
3. 判断 Standard Schema 与 Standard JSON Schema 能否消除框架耦合或 runtime validation 责任。
4. 明确当前 typed Record Change 应执行的最小动作，以及真正要 schema-first redesign 时的推荐与
   必须先验证的事项。

本报告不授权修改 Change、产品实现、依赖、lockfile、Decision 或测试；也不把推荐表述成已经采用。

#### 调查范围与依据

**项目事实。** 在 Git `f63e046fdd7c60cead84f24b292cdb7cc86eac8c` 和有未提交 typed Record
Change 改动的工作树中，读取了：

- `changes/complete-typed-record-authoring/{proposal,design,tasks}.md`；
- `docs/{coding-style,architecture,configuration,quality-metrics}.md`；
- `src/product/definition/{check-definition,custom-check}.ts`；
- `src/product/quality-core/check-record/foundation-validation/{definition,quality-record}.ts`；
- machine v3 的 TypeBox schema/validation 与独立 Ajv contract-material support；
- `package.json` 和 `pnpm-lock.yaml`，以及与 Check authoring/runtime validation 相关的 active
  Decisions。

**外部能力依据。** 仅使用库、规范、npm 和 GitHub 的一手页面：
[TypeBox 官方仓库](https://github.com/sinclairzx81/typebox)、
[Zod JSON Schema 文档](https://zod.dev/json-schema)、
[Zod library-author 指引](https://zod.dev/library-authors)、
[Valibot JSON Schema 指引](https://valibot.dev/guides/json-schema/)、
[Valibot integration 指引](https://valibot.dev/guides/integrate-valibot/)、
[ArkType Type API](https://arktype.io/docs/type-api)、
[ArkType integrations](https://arktype.io/docs/integrations)、
[Ajv TypeScript 指引](https://ajv.js.org/guide/typescript.html)、
[Ajv schema-language 指引](https://ajv.js.org/guide/schema-language)、
[Standard Schema](https://standardschema.dev/schema) 与
[Standard JSON Schema](https://standardschema.dev/json-schema)。JSON Schema 的标准定位来自
[JSON Schema 官方 specification](https://json-schema.org/specification)。

**热度与维护快照。** 观测时间为 `2026-08-21T02:22:26Z`。下载量采用
`2026-07-22` 至 `2026-08-20` 的 30 个完整 UTC 日，逐包调用 npm 官方
[downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)，例如
[TypeBox](https://api.npmjs.org/downloads/point/2026-07-22:2026-08-20/typebox)、
[Zod](https://api.npmjs.org/downloads/point/2026-07-22:2026-08-20/zod)、
[Valibot](https://api.npmjs.org/downloads/point/2026-07-22:2026-08-20/valibot)、
[ArkType](https://api.npmjs.org/downloads/point/2026-07-22:2026-08-20/arktype) 与
[Ajv](https://api.npmjs.org/downloads/point/2026-07-22:2026-08-20/ajv)。版本、发布时间、license、
tarball unpacked size、file count、production dependencies 来自各包的 npm 官方 registry document：
[typebox](https://registry.npmjs.org/typebox)、[zod](https://registry.npmjs.org/zod)、
[valibot](https://registry.npmjs.org/valibot)、[arktype](https://registry.npmjs.org/arktype)、
[ajv](https://registry.npmjs.org/ajv)。stars、archived、默认分支最近 push 取自对应官方 GitHub
repository API：
[TypeBox](https://api.github.com/repos/sinclairzx81/typebox)、
[Zod](https://api.github.com/repos/colinhacks/zod)、
[Valibot](https://api.github.com/repos/fabian-hiller/valibot)、
[ArkType](https://api.github.com/repos/arktypeio/arktype)、
[Ajv](https://api.github.com/repos/ajv-validator/ajv)。

“unpacked size / file count”只是 npm tarball 的安装面代理，**不是** tree-shaken 或 Bun 产物的
bundle 测量；本轮未安装候选、未跑 benchmark、未做供应链审计、也未验证每个候选在项目 TypeScript
native preview/Bun 组合中的 declaration behavior。下载量包含 transitive installs、CI 和镜像，stars
也不等于独立用户、正确性、安全性或本项目适配，故只作为维护/采用信号，不能替代技术判断。

#### 调查结果与边界

##### 已确认的项目结论

1. **当前 active Plan 的事实范围。** 它的明确 non-goal 是不改变 Record runtime shape /
   validation / identity / Core / policy / machine。把 `fields` 改为某一框架 Schema 会实质改变公开
   authoring grammar、runtime normalization、public declarations、catalog projection 与验证证据。该事实
   支持“继续本 Plan 时不要顺带扩大范围”的最小路径；它**不**限制用户显式授权修订/replan 同一
   Change，或选择以独立 Change 隔离该 redesign。
2. **runtime validation 仍不可省略。** 本项目会接受 JavaScript callers、dynamic/widened catalog 与
   callback 产生的 unknown field values；而 Record 会进入 identity、reference/policy、Core 和 machine
   publication。任何框架只能取代其中一部分结构检查，不能证明 ownership、canonical order、identity
   projection、recordId、conflict/replay 或 reporter 生命周期。
3. **TypeBox 被优先考虑不只是惯性。** 它的官方定位正是“生成 JSON Schema objects、从其导出
   TypeScript static type，并能用标准 JSON Schema validator runtime check”；仓库已在最接近的
   machine DTO 边界以同一 API 成功实现并用 Ajv 独立检查生成的 schema。它与“可序列化/发布/独立
   验证的 schema”及现有 `Value.Check` error-pointer path 最直接相符，同时无需新增框架。
   不过这只证明未来 schema-first 方案的**首选候选**，不等于 current Record descriptor 已经应被
   替换。

##### 候选对照

| 候选 | runtime validation 与 static inference | JSON Schema、动态 schema、错误模型 | 公共 authoring 耦合与项目适配判断 |
| --- | --- | --- | --- |
| **TypeBox** | `Type.*` 建构 JSON Schema object；`Type.Static<typeof S>` 由同一 literal schema 导出静态类型；仓库已使用 `Value.Check/Errors`。也可把 schema 交给标准 JSON Schema validator。 | 原生 JSON Schema object 最利于 publication 与 Ajv 独立复核。外部/动态 JSON Schema 可在 runtime 验证，但从运行期 `unknown` 读取的 schema 不能凭空得到精确 TypeScript type；TypeScript 只能对编译器可见的 schema literal 精确推导。现有 `Value.Errors` 与 Ajv 都给 pointer/keyword 型错误，产品仍须映射成自己的 diagnostic。 | 直接接受 TypeBox schema 会把公共 authoring 绑定到 `typebox`。这在未来“Vibe Check owns the schema language”的方案中可接受，且与现有 owner、JSON publication 及无新增依赖相符。官方 Standard Schema / Standard JSON Schema compatibility tables 在本次观测时未列出 TypeBox；不能声称它已有该互操作能力。**未来 redesign 的首选。** |
| **Zod 4** | 成熟的 `parse` / `safeParse` 和 `z.infer` authoring 体验；input/output 可因 coercion/transform 不同。 | Zod 4 原生 `z.toJSONSchema()`，也有实验性 `z.fromJSONSchema()`；官方明确列出 transform、Date、Map、Set 等不能无损表达为 JSON Schema，转换可抛出。`ZodError` 比 JSON pointer 更面向应用，但仍需产品映射。runtime 构造 schema 合法，不会把未知动态 schema 变成静态精确类型。 | Zod、Standard Schema、Standard JSON Schema 三者的互操作最好，且热度最大；但 Vibe Check 不需要 transform/coercion，并且采用它会新增公共 schema DSL / 依赖，或要求将当前 machine TypeBox owner 双轨化。**若产品明确要让消费者使用最通行的 schema DSL 且不把 JSON Schema object 作为 authoring truth，Zod 是首要备选；不是当前 scope 的替换理由。** |
| **Valibot** | 组合函数和 `safeParse`，`InferInput` / `InferOutput`；模块化设计以 tree-shaking 为主。 | JSON Schema 由额外 `@valibot/to-json-schema` 导出；官方明确说库不是按 JSON Schema 实现，advanced transform 不可表达。Standard Schema 内置；Standard JSON Schema 要经该额外包的 `toStandardJsonSchema()`。issues 有 path/message，但 vendor options / error details 仍非 Standard Schema 的完整统一语义。动态 unknown schema 同样不产生静态推导。 | 对浏览器 bundle 很有吸引力，但本产品是 Bun runtime、当前并无 bundle 证据，且要为 machine publication 增加转换包和 compatibility failure。**Zod 的轻量备选，而非 TypeBox/JSON-Schema-first 的同等替代。** |
| **ArkType** | 强类型 DSL / object definition，`infer` 与 `inferIn` 分开，调用/`assert`/`allows` 负责 runtime。可表达的 TypeScript 语义较强。 | 每个 Type 可 `toJsonSchema()`；官方说支持 bidirectional conversion，JSON Schema import 是额外 `@ark/json-schema` 包。错误信息更偏人读表达；若让产品维持稳定 pointer/diagnostic 协议仍须适配。运行期 JSON Schema input 仍不能为未知 input 生成可静态访问的类型。 | 实现 Standard Schema 与 Standard JSON Schema，但 DSL 的表达力显著超过当前四种 scalar descriptor，容易把 product policy semantics 混进库语法；有三个 production dependencies。**适合需要其类型级语言的产品，不是窄、可发布 Record catalog 的默认。** |
| **Ajv 8** | 专业 JSON Schema/JTD validator；`compile<T>` 可以把使用者已有 `T` 接到 type guard，JTD 有 `JTDDataType`，但它不是从任意 JSON Schema authoring literal 自动产生完整 TS 类型的 DSL。 | 五者中最适合任意外部/动态 JSON Schema 的编译、标准 draft/JTD 支持和独立验证。错误为 JSON Schema `ErrorObject`；官方说明 JSON Schema 与 JTD 错误类型是开放 union，需要按 keyword cast/narrow。 | 不提供 Record authoring 的同源 static inference，因此单独采用会继续保留 TypeScript types 与 schema 的双源风险。它已存在于仓库的独立 artifact check 支持中，适合作为 **TypeBox schema 的独立 verifier** 或将来用户提供 raw JSON Schema 的 boundary；**不作为 schema-first authoring 框架。** |

##### 维护、热度与安装面快照

| 包（latest 于观测日） | latest npm publish | 30 日下载 | GitHub stars / default-branch push | unpacked size / files / production dependencies | 解读 |
| --- | ---: | ---: | ---: | --- | --- |
| `typebox@1.3.16` | 2026-08-19 | 28,924,508 | 6,917 / 2026-08-19 | 1,483,425 B / 1,379 / 0 | 活跃且零生产依赖；下载明显低于 Zod/Ajv，但足以表明持续采用。 |
| `zod@4.4.3` | 2026-05-04 | 1,023,677,855 | 43,499 / 2026-08-20 | 4,558,122 B / 718 / 0 | 采用/社区信号最强；不能据此推导更适合 Vibe Check。 |
| `valibot@1.4.2` | 2026-06-28 | 67,709,534 | 8,943 / 2026-08-20 | 1,843,461 B / 9 / 0 | 活跃且采用可观；tarball 小文件数不等于最终 bundle。 |
| `arktype@2.2.3` | 2026-07-07 | 5,860,783 | 7,838 / 2026-07-07 | 336,625 B / 113 / 3 | 有近期 release，但 repo push 与 release 同日；应在真正采用前复查维护节奏。 |
| `ajv@8.20.0` | 2026-04-24 | 1,469,547,111 | 14,808 / 2026-05-12 | 1,033,496 B / 466 / 4 | 最强 runtime JSON Schema 生态信号；最近 release/push 早于其他多数候选。 |

上述五个官方 GitHub API 均报告 `archived: false`。没有将 package tarball size 误报为 bundle size，也
没有以下载量排序替代功能适配。

##### Standard Schema / Standard JSON Schema 是否改变耦合

**已确认事实：** Standard Schema V1 是一个在 `~standard.validate` 上提供 runtime validation、
input/output type 与标准化 `message`/`path` issues 的 TypeScript interface；validate 可以是同步或
异步。Standard JSON Schema V1 是正交 interface，提供 input/output JSON Schema conversion，转换
可能 throw；它本身**没有** validation。规范列出的 Standard Schema 实现者包括 Zod 3.24+、
Valibot 1.0+、ArkType 2.0+；Standard JSON Schema 页面列出 Zod 4.2+、ArkType 2.1.28+、以及经
`@valibot/to-json-schema` 的 Valibot 1.2+。两张官方列表在本次观测时均未列 TypeBox 或 Ajv。

**推断：** 若 Vibe Check 将来只需接受“用户提供一个 opaque validator，给 unknown 值验证并接收
value/issues”，`StandardSchemaV1` 能把 public integration 从某一 vendor type 改为规范 interface，
所以确实降低框架耦合。Zod 官方对 library authors 也建议这种 black-box 场景优先考虑 Standard
Schema。若只需输入/输出的可导出 JSON Schema，Standard JSON Schema 同样能减少 Zod/Valibot/
ArkType 三者的专用 converter adapter。

**不改变的边界：** 本产品不能把 Record type 当 opaque validator：它必须读取并 canonicalize field
IDs、requiredness、identityFields 与 policy operands，之后还要发布自己的 catalog。这些 product
semantics 不会由两个标准 interface 表达；Standard JSON Schema 的 conversion 也可能失败，且不负责
runtime validation。因而二者不会取消 Vibe Check 的 descriptor/domain validation，亦不能让 TypeBox
直接与 Zod/Valibot/ArkType authoring 无缝互换。若公共 API 导出/引用 `@standard-schema/spec` 类型，
其官方 FAQ 还要求该 package 是 regular dependency 而非仅 devDependency。

##### 建议、未采用状态与复核条件

1. **路径 A——继续当前 Plan（推荐的最小路径）：** 保持 descriptor-array + helper-local TypeScript
   projection 的既定范围，继续将 runtime validation 当 final authority；不在本轮实现中引入 schema
   framework 或改变 `recordTypes` public shape。
2. **路径 B——用户决定 schema-first：** 可以显式重写/replan 当前 Change，使 proposal、design、
   tasks 和验收一起改为新 outcome；也可以另开独立 Change。后者是**隔离影响面的推荐**，因为它可让
   public authoring grammar、runtime normalizer/validator、declarations、machine catalog projection 和
   验证矩阵独立审阅，同时不掩盖既有 typed-inference 工作的范围与证据。它不是当前 Plan 或项目规则
   强制要求的唯一流程。无论选择哪一条，若将 TypeBox public authoring coupling 定为持续方向，都应按
   长期决策流程审阅并形成/更新 Decision。
3. **路径 B 的 TypeBox probe：** 若需求是减少结构校验重复，并同时要求 field schema 能发布为
   JSON Schema、由独立 Ajv 复核和从同一 literal 得到 `Static`，优先做一个 **TypeBox schema-first
   probe**。方案应让 TypeBox 只承担 field object 的结构/primitive constraints；单独的 product
   normalizer/validator 仍承担 recordTypeId、identityFields、canonical order、policy、ownership、
   identity 与 lifecycle。不要为隐藏 TypeBox 再造同义 schema DSL。
4. **推荐备选：** 若独立产品决策的首要目标改为“消费者能任选主流 schema validator”，而 product
   不再需要内省 fields/policy，采用 `StandardSchemaV1` (必要时加 `StandardJSONSchemaV1`) 才有意义；
   在实现者中 Zod 是成熟度/生态最佳的直接框架备选，Valibot 是 bundle-sensitive 备选，ArkType 只在
   其扩展 type language 本身有真实需求时复查。Ajv 保留为 raw JSON Schema / independent verifier，
   不单独承担 static-authoring source。
5. **尚未采用/验证：** 本报告未安装、升级或 benchmark 任一包；未证明 TypeBox 的 future schema
   authoring 能通过 `defineCheck` contextual inference、emitted declaration、isolated package consumer、
   Bun runtime 和 machine contract 的全矩阵；未测 JSON Schema conversion 的所有 Record/policy edge
   cases；未作 license/security/SBOM 审计。任一 redesign 前必须以这些最小 probes、目标 bundle
   measurement 与实际 consumer authoring sample 重新调查并形成 Decision。
