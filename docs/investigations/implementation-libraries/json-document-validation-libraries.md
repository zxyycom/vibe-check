# 严格 JSON 文档校验库调查

## 调查信息
- 核心问题: 在 Vibe Check 的 `add-json-validation` Change 中，哪个库能以最小 adapter 在 Bun 中验证严格 JSON 并可靠检测 decoded duplicate key，同时怎样在热度、生态、接入复杂度与运行时重量之间取舍？
- 状态: 已结束
- 最新报告时间: 2026-08-24T14:28:56Z

## 调查报告

### 严格 JSON 与重复 key 的最小库选择
- 形成时间: 2026-08-24T13:12:21Z

#### 形成时背景

用户希望确认 `add-json-validation` 是否可以保持为“成熟库加薄 adapter”的小型实现，并明确要求先调查库的热度、生态、复杂度与重量。当前 Change 仍是 active Plan，目标是严格验证 UTF-8、完整 JSON grammar、BOM/comments/trailing comma/trailing content 和 decoded duplicate key；它不是 JSON Schema Check，也不允许公开 parser/AST 或原始 document。

本轮工作区基线是 Git `36bdeea01add43b8044bb6431d030315384ce086`。形成时有未提交的 `changes/add-json-validation/{.change-plan.json,proposal.md,design.md,tasks.md}` 计划材料改动；本调查不修改这些材料，也不表示已经采用候选。根 `package.json` 只有 `ajv` devDependency，且未锁定本调查的专用 JSON document parser。若未来采用外部库，它必须作为 package production dependency 完成 license、candidate artifact 与 isolated consumer 闭合。

#### 调查目的

1. 判断能否用第三方库加薄 adapter 实现 v1，而无需先写完整 JSON parser。
2. 比较候选在严格 JSON、decoded duplicate-key、位置、Bun/TypeScript、维护/采用信号、接入复杂度和分发重量上的适配度。
3. 给出一个**推荐但尚未采用**的候选，以及足以把推荐升级为实施选择的最小本地 spike。

本报告不授权安装依赖、修改 lockfile、调整 Change scope、更新 Decision 或实现 Product runtime。

#### 调查范围与依据

**项目事实。** 审阅了当前 `changes/add-json-validation/{proposal.md,design.md,tasks.md}`、`package.json`、`docs/decisions/complete-first-release-check-set-before-publication.md`，以及 package candidate 的 dependency-audit/isolated-install 实现。项目事实表明：候选需要进入 production dependency closure，不能靠开发环境或祖先 `node_modules` 满足。

**外部能力依据。** 仅使用候选维护者、npm 与 ECMAScript 的一手资料：

- [Momoa JavaScript README](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/README.md)、[package manifest](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/package.json)、[parser source](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/src/parse.js)、[npm registry](https://registry.npmjs.org/%40humanwhocodes%2Fmomoa)、[npm downloads API](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/%40humanwhocodes%2Fmomoa) 与 [GitHub repository API](https://api.github.com/repos/humanwhocodes/momoa)；
- [jsonc-parser README](https://raw.githubusercontent.com/microsoft/node-jsonc-parser/main/README.md)、[parser source](https://raw.githubusercontent.com/microsoft/node-jsonc-parser/main/src/impl/parser.ts)、[npm registry](https://registry.npmjs.org/jsonc-parser)、[npm downloads API](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/jsonc-parser) 与 [GitHub repository API](https://api.github.com/repos/microsoft/node-jsonc-parser)；
- [json-source-map registry](https://registry.npmjs.org/json-source-map)、[source](https://raw.githubusercontent.com/epoberezkin/json-source-map/master/index.js)、[json-parse-even-better-errors README](https://raw.githubusercontent.com/npm/json-parse-even-better-errors/main/README.md)、[其 npm registry](https://registry.npmjs.org/json-parse-even-better-errors)，以及 [ECMAScript `JSON.parse` specification](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse)。

**观测方式与限制。** 外部数据观测于 `2026-08-24T13:11:26Z`；下载量是 `2026-07-25` 至 `2026-08-23` 的 30 个完整 UTC 日 npm downloads API 值。latest version、发布时刻、license、production dependency 数和 `unpackedSize` 来自 npm registry；stars、默认分支最近 push 与 archived 状态来自 GitHub API。下载量包含 transitive install、CI 与镜像，stars 也不代表安全性、正确性或本项目适配。`unpackedSize` 是安装面代理，不是 tree-shaken bundle、Bun 产物或常驻内存测量。本轮没有安装候选、跑 benchmark、执行 Bun import、做漏洞/SBOM/许可证法务审计或测量 AST 内存。

#### 调查结果与边界

##### 已确认事实

1. **库加 adapter 足够，`JSON.parse`/Ajv 单独不够。** `JSON.parse` 在构造对象时会覆盖词法上较早的同名属性；因此它、reviver 和接收已构造 data 的 Ajv 都不能事后发现 `{"a": 1, "\\u0061": 2}`。Ajv 也不是此 Change 所需的任意 raw JSON document parser。它可继续服务独立 JSON Schema Change，但不替代 strict-document boundary。
2. **候选必须保留对象成员，而不能只返回 JavaScript object。** 否则 duplicate-key 证据在 adapter 之前已丢失。对于本 Change，strict grammar、完整消费、decoded key、位置与安全错误归一化是一个边界；热度高但在这些点失真的库不能因体积小而入选。
3. **当前工作量可保持很小。** 推荐路径是：读取并作 fatal UTF-8 decode / BOM 检查，再用库 parse，再遍历每个 object 的成员建立局部 `Set<string>`，最后把库的错误归一化为 Check-owned reason/data。它不需要公开 AST、引入通用 validation framework 或自写完整 JSON grammar parser。

##### 候选对照

| 候选（观测时 latest） | 严格 JSON 与 duplicate-key 适配 | 热度与生态快照 | 复杂度与重量代理 | 结论 |
| --- | --- | --- | --- | --- |
| **`@humanwhocodes/momoa@3.3.12`** | 默认 `mode: "json"`，默认不允许 trailing comma；parse 产生保留每个 object member 的 AST，key 是 decoded string value，并有 location/offset。README 明列 Bun 安装与 ESM import。 | 13,763,253 次 30 日下载；2026-08-21 发布/最近 push；357 stars；未归档。 | 0 production deps、Apache-2.0、`unpackedSize` 232,033 B。adapter 只需 parse + 遍历 object members；代价是每个输入会 materialize AST，未做真实内存测量。 | **推荐。** 在本次四个候选中最直接满足 strict JSON、decoded duplicates、位置与 Bun 线索。 |
| **`jsonc-parser@3.3.1`** | `visit` 提供 decoded property、offset/line/column；以 object stack 可检测重复。可配置 `disallowComments` 并拒绝 trailing comma/empty content，但库是 fault-tolerant parser，adapter 必须把任何 parse error 判为失败。 | 236,571,777 次 30 日下载；2024-06-24 最近 npm 发布、2026-08-12 最近 push；754 stars；未归档。 | 0 production deps、MIT、`unpackedSize` 212,821 B。SAX-style `visit` 可能避免持久 AST，但本轮未测内存；严格选项/error handling 比 Momoa 多一个容易遗漏的适配面。未找到维护者的 Bun 专门说明。 | **可行备选。** 采用信号最高且轻，但其 JSONC/容错定位让 strict adapter 更需谨慎。 |
| `json-source-map@0.6.1` | 自有 parser/位置能力，但其 object evaluation 以 key 覆盖先前值，不能保留两个相同或 decoded-equivalent 成员。 | 4,659,751 次 30 日下载；2019-08-07 最近 npm 发布、2024-02-25 最近 push；76 stars。 | 0 production deps、MIT、`unpackedSize` 39,950 B。 | **排除。** 最小分发体积无法弥补 duplicate-key 证据丢失，维护也明显较旧。 |
| `json-parse-even-better-errors@6.0.0` | 包装 `JSON.parse`，README 说明会去除 leading BOM；因此既不能拒绝 BOM，也不能观察已覆盖的 duplicate key。 | 434,671,160 次 30 日下载；2026-05-08 最近 npm 发布、2026-06-18 最近 push；27 stars。 | 0 production deps、MIT、`unpackedSize` 10,230 B。 | **排除。** 高下载和极小安装面只说明普适错误包装需求，不满足本 Change 的核心 document 语义。 |

##### 推荐、未采用状态与最小 spike

**推荐（尚未采用）：** 选择 `@humanwhocodes/momoa@3.3.12`，并用 package-private adapter 维护本 Change 的 closed reason、safe path/pointer/key/location 和 Record identity。它让 v1 保持“库加薄 adapter”，而不是把 JSON parsing 发展为 Vibe Check 的公共能力。

**为什么不是仅按热度选 `jsonc-parser`：** 后者是合理备选，并且下载量远高于 Momoa；但它明确是 JSON-with-comments、fault-tolerant parser。对于本 Change 的 fail-closed strict JSON，adapter 必须额外完整处理 options 与 errors。Momoa 默认语义和 AST model 更接近实际问题，因此预期实现/审查复杂度更低。该判断是基于公开 API 的推断，不是 benchmark 结论。

**必须先完成的最小 spike：**

1. 在受授权的依赖变更中临时接入 Momoa，验证 Bun ESM import、production dependency 和 candidate artifact resolution；本报告未执行该操作。
2. 验证所有合法 root（`null`、boolean、number、string、array、object）以及 BOM、comments、trailing comma、trailing content、empty text 的拒绝路径。
3. 遍历每个 `Object.members`，覆盖直接/嵌套重复与 `"a"`/`"\\u0061"` decoded duplicate；确认只保留安全 key/path/位置，不传播库的 Error 或原始文本。
4. 用 emoji 前缀样本确认 library offset 的单位；若无法稳定定义公共位置契约，首版省略位置字段。
5. 只有 spike 通过后，才把候选加入 production dependency、更新 lockfile、完成 license/material、isolated consumer、semantic Case 和 Gate 验证。

**残余边界。** 推荐不等于 Bun 实际运行已通过，也不证明 Momoa 的 AST 对最终 `maximumBytes` 默认足够轻。若用户选择很大的 byte limit 或要求低内存流式处理，应先测量真实 fixtures；届时 `jsonc-parser` 的 visitor path 值得重新比较。若 Momoa 的 spike 失败，先用同一案例矩阵验证 `jsonc-parser`，而不是直接开始自写 parser。

### 依赖实际加载面与零依赖严格 grammar 路径
- 形成时间: 2026-08-24T13:38:49Z

#### 形成时背景

用户质疑前一轮报告中的约 200 KB 数字是否把“整包大小”误当成了实际依赖，并澄清其预期可能只是“校验 JSON 有效”，而非使用高级 parser 功能。当前 Change 仍明确把 decoded duplicate key、BOM、comments、trailing comma、trailing content、位置/指针和 closed issue reasons 作为 strict-document boundary 的一部分；因此“只校验 JSON 有效”的意图与当前已规划的验收语义存在需要明确处理的范围差异。

本轮工作区仍基于 Git `36bdeea01add43b8044bb6431d030315384ce086`，且保留先前未提交的 Change Plan 与调查文件改动。本轮没有安装依赖、写入 lockfile、修改 Change、实现 runtime 或运行 package candidate；仅对候选 npm tarball 和入口模块做只读检查，并在现有 Bun 上运行内建 API 的临时 stdin 样本。

#### 调查目的

1. 将 npm 整包分发大小、生产依赖树大小与 Bun 直接 root import 的静态模块加载面区分开来，纠正前一轮“重量”指标的解释边界。
2. 判断若产品只需要严格 JSON document 有效性，能否完全不引入第三方 dependency。
3. 明确当前 Change 中哪些已规划能力是实现“有效 JSON”所必需的，哪些是额外产品语义，以及用户需要作出的最小范围决定。

#### 调查范围与依据

**候选 artifact 检查。** 于本报告形成时间，从 npm registry 的 latest tarball 元数据下载并临时解包 `@humanwhocodes/momoa@3.3.12`、`jsonc-parser@3.3.1` 与 `json-parse-even-better-errors@6.0.0`，统计压缩 tarball、整个解包目录和 package root ESM entry 的静态 JavaScript 闭包。Momoa 的 `package.json` 只公开 root import/require；其 ESM root 为 `dist/momoa.js`。`jsonc-parser` 的 ESM root `lib/esm/main.js` 静态导入 parser、scanner、format、edit 与 string-intern 模块。计数是磁盘 source bytes，不是 tree-shaken bundle、Bun 编译缓存、运行时常驻内存、冷启动或解析峰值内存。来源为 [Momoa registry manifest](https://registry.npmjs.org/%40humanwhocodes%2Fmomoa/3.3.12)、[jsonc-parser registry manifest](https://registry.npmjs.org/jsonc-parser/3.3.1) 与 [json-parse-even-better-errors registry manifest](https://registry.npmjs.org/json-parse-even-better-errors/6.0.0)。

**内建 API 样本。** 在本工作区的 Bun `1.3.14` 上，以临时 stdin 脚本调用 `new TextDecoder("utf-8", { fatal: true })` 和 `JSON.parse`：`{}`、`null` 成功；非法 UTF-8 产生 `TypeError`；leading U+FEFF、line comment、trailing comma 与 trailing content 都产生 `SyntaxError`；`{"a":1,"\\u0061":2}` 成功并得到 `{ "a": 2 }`。该实验只证明该版本这些输入的行为，不替代跨版本或产品集成验证。

**语义依据与范围。** [RFC 8259 §4](https://www.rfc-editor.org/rfc/rfc8259#section-4) 的对象 grammar 允许重复成员名，而名字唯一性使用的是 `SHOULD`，不是 `MUST`；名称不唯一时接收方行为不可预测。故 decoded duplicate-key 拒绝是一项有价值的更严格产品语义，但不是完成 UTF-8 + JSON grammar + 完整消费校验的前提。当前 Change 文件中仍把它列为必须失败的领域 issue，本报告不会擅自删除该要求。

#### 调查结果与边界

##### 已确认：前一轮的 200 KB 不是传递依赖树

三项不同的“大小”不可混为一谈：

| 路径 | 新增 production 依赖 | 压缩 tarball | 整包解压大小 | Bun 的 root ESM import 静态 JS 闭包 | 含义 |
| --- | ---: | ---: | ---: | ---: | --- |
| 原生 `TextDecoder` + `JSON.parse` | 0 | 0 | 0 | 0 | Bun/JavaScript 内建能力，不新增 package。 |
| `@humanwhocodes/momoa@3.3.12` | 0 | 46,812 B | 232,033 B | 92,472 B | 整包还含 CJS 副本、types、README 和许可证；root ESM 是单一 bundle，没有仅 `parse` 的公开 subpath。 |
| `jsonc-parser@3.3.1` | 0 | 27,354 B | 212,821 B | 75,061 B | root ESM 会静态带入 parser、scanner、formatter 与 editor 实现；整包还含声明、CJS/UMD 等发布材料。 |
| `json-parse-even-better-errors@6.0.0` | 0 | 4,561 B | 10,230 B | 4,204 B | 很小，但包装 `JSON.parse`，不能保留 duplicate-key 证据，且会去除 BOM。 |

因此，前一轮两个“约 200 KB”是**整个 npm 包解压后的文件总量**，不是“安装以后还会拉取约 200 KB 的依赖”。Momoa 和 jsonc-parser 的 production dependency 数都为零。对当前 Bun Product runtime，普通 package import 不是构建产物的 tree-shaking 场景；应把上表的 root-import 静态闭包当作较保守的直接代码加载面，而不能假设只因写了 `import { parse }` 就只运行或交付一个 parse-only 子模块。实际内存、启动时间和未来 Bun resolver 行为尚未 benchmark，不能由字节数外推。

##### 若“有效 JSON”只指严格字节和 grammar，零依赖足够

最小可审计路径是：在读取的 `Uint8Array` 上先显式检查 UTF-8 BOM bytes，再以 fatal `TextDecoder` decode，最后调用 `JSON.parse(text)`；不使用或公开其 native message。它可接受所有 JSON root value，并在本轮 Bun 样本中拒绝无效 UTF-8、BOM、comments、trailing comma 与 trailing content。它不需要 Ajv、JSON Schema、AST、formatter 或 parser library。

但原生路径也有明确上限：

- `JSON.parse` 已将 `"a"` 和 `"\\u0061"` 归并为同一个属性，无法再检测 decoded duplicate key；
- 它不能从稳定 API 提供 member-level pointer、重复项位置或 parser token/AST；
- 若继续保留 `syntax` 与 `trailing-content` 等细粒度 closed reason，而又不读取 native error wording，则需另行定义/实现分类规则。将所有 parse failure 归为一个 closed `invalid-json` reason 才是与“只验证有效性”一致的简化。

这说明外部 parser 并非“验证 JSON 有效”所必需；它只是在保留当前 Change 的重复 key、定位和细粒度错误语义时，替代自写 tokenizer/parser 的较小实现成本。

##### 小而窄的 duplicate-key 包不构成更安全的默认选择

另外检查了 `json-dup-key-validator@1.0.3`：其 registry 标示 tarball 5,793 B、解包 20,742 B、主 CommonJS source 约 12 KB，但它有一个 production dependency、没有 TypeScript 声明，latest 发布于 2021-02，且本轮没有以 `"a"`/`"\\u0061"`、BOM、完整消费和 Bun 运行矩阵证明其行为。它的尺寸不足以抵消这些未闭合的正确性/维护风险，不能仅因更小就替代 Momoa。相关版本与 dependency 数据见其 [npm registry manifest](https://registry.npmjs.org/json-dup-key-validator/1.0.3)。

##### 建议与待决范围

**推荐的产品取舍：** 如果用户的真实 v1 要求就是“文件是严格有效 JSON”，推荐把 Change 收窄为零依赖的 fatal UTF-8 + explicit BOM + `JSON.parse` boundary，并同步删除 decoded duplicate-key、member pointer/position 以及依赖这些语义的细粒度 issue/测试义务。这样没有外部 runtime dependency，也不引入高级 parser 功能。

这不是纯实现优化：当前 proposal/design/tasks 明确要求 decoded duplicate-key 失败并要求后续 JSON Schema Check 复用同一语义。因此在用户确认前，本轮没有改写 Change 或开始实现。

若用户决定**保留** duplicate-key 为 error，Momoa 的实际 root ESM 代码面约 92 KB、production dependency 为零，仍是相对轻的“库 + 薄 adapter”方案；它的多余 AST/print/traverse 代码是单一 public entry 的代价，而不是重型传递依赖。此时应先完成已列出的 Bun spike，再授权安装并实现。若用户决定**删除** duplicate-key，下一步应先将 Change Plan 的 outcome、design、tasks 和验收案例同步收窄，再直接以零依赖实现；不应把当前计划默默降级。

**仍未验证的边界。** 未测原生路径在本项目完整 callback、safe Record/four-state settlement、`maximumBytes` 与 isolated consumer 中的表现；未 benchmark 大文件、深层 JSON 或 AST 内存；也未实测 Momoa/jsonc-parser 的安装、license 归档、Bun import 和 candidate artifact。这些工作仅在用户选定保留或移除 duplicate-key 语义后才有明确的最小实施路径。

### 极简候选复核：保留 duplicate-key 时的最小可行面
- 形成时间: 2026-08-24T13:59:46Z

#### 形成时背景

用户继续追问是否存在“极简”库，而不是接受前一轮的 Momoa/jsonc-parser。此前已确认：若只需严格 JSON document 有效性，Bun 内建 API 已可零依赖完成；但当前 Change 仍要求**所有** decoded duplicate key（包括值相同者）失败。因此本轮把“极简”限定为：在不把 grammar correctness 交给脆弱 regex/scanner 的前提下，尽量小地保留 duplicate-key 证据。

本轮没有在工作区安装 package 或写入 lockfile。为避免把 npm 分发体积误作运行时重量，候选均从 npm tarball 临时解包于系统临时目录，检查入口源码/manifest 后删除；随后仅在 Bun `1.3.14` 的临时脚本中运行无依赖候选。任何 Bun 试验结果都不等于本项目的 installed-runtime、candidate artifact 或 isolated-consumer 验证。

#### 调查目的

1. 寻找比 Momoa 更小、同时仍可支撑当前 strict JSON + decoded duplicate-key 语义的候选。
2. 分辨“单独看起来很小”的库是否真的完成 strict grammar、全部 root、完整消费、BOM 和 escaped key 的要求。
3. 在“只校验有效 JSON”“体积最小”和“保持当前 duplicate-key 要求”之间给出可执行的选择边界。

#### 调查范围与依据

**筛选与 artifact 方法。** 检查 npm 搜索结果和候选 latest tarball 的 production manifest、公开入口、源码字节数及 source 行为；下载计数均是 `2026-07-25` 至 `2026-08-23` 的 30 个完整 UTC 日。候选涵盖 `lossless-json`、`clarinet`、`json-dup-key-validator`、`json-parse-ast`、`json-bigint`，以及只作对照的原生 API。npm registry、downloads API 与 GitHub repository API 是版本、依赖、大小、发布时间和维护快照的依据；相关直接入口见 [lossless-json registry](https://registry.npmjs.org/lossless-json)、[clarinet registry](https://registry.npmjs.org/clarinet)、[json-dup-key-validator registry](https://registry.npmjs.org/json-dup-key-validator)、[json-bigint registry](https://registry.npmjs.org/json-bigint)、[lossless-json downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/lossless-json)、[clarinet downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/clarinet) 与 [json-dup-key-validator downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/json-dup-key-validator)。

**行为样本。** 对每个可运行候选，最小矩阵至少涵盖：BOM、comments、trailing comma、trailing content、合法 primitive root、`"a"`/`"\\u0061"`，以及值相同与不同的 duplicate。对 `clarinet` 还验证了 nested object/array、empty key、NUL、lone surrogate 与 emoji escape；在先经 `JSON.parse` 成功的 object/array 输入上，事件栈能检出相同值、escaped 和 nested duplicate。没有做随机模糊测试、性能/内存 benchmark、漏洞/SBOM 审计或完整项目集成。

#### 调查结果与边界

##### 结果总览

| 路径 | 直接代码/依赖面 | 关键行为 | 维护与接入面 | 结论 |
| --- | --- | --- | --- | --- |
| 原生 `TextDecoder` + `JSON.parse` | 0 B 新 package、0 生产依赖 | 严格 grammar/full-consumption 可做；所有 duplicate 证据丢失。 | Bun 内建。 | **只需有效 JSON 时最佳。** |
| `lossless-json@4.3.1` | root ESM 静态 JS 闭包 29,895 B；0 production deps；tarball 79,113 B、整包 332,517 B。 | 严格 whitespace/full-consumption；decoded、**不同值** duplicate 会抛错，但相同值 duplicate 被明确接受，且 `onDuplicateKey` 不会被调用。 | ESM、bundled TS types、MIT；2026-07-31 最新发布/同日 push；30 日 3,785,075 下载、475 stars。 | **最接近的现代极简单库，但不满足当前“任何 duplicate 都失败”。** |
| `clarinet@0.12.6` + native grammar gate | `clarinet.js` 23,482 B；0 production deps；tarball 10,695 B、整包 34,848 B。 | 独用时不接受 primitive root 且会接受 trailing content，不能当 strict validator；但先以 `JSON.parse` gate 后，将它只用于 object/array 的 `onopenobject`/`onkey` decoded-key stream，可检出相同值、escaped 和 nested duplicate。它不建 AST，但 grammar gate 仍会短暂 materialize 后丢弃 JS value。 | CommonJS、无 bundled TS types、BSD-2-Clause；最新发布/源码 push 均为 2023-08；30 日 1,063,973 下载、467 stars。 | **当前语义下尺寸最小的可行组合候选，仍须 integration spike。** |
| `json-dup-key-validator@1.0.3` | 自有 main 12,065 B、整包 20,742 B，另有 `backslash` production dependency。 | 检出 escaped duplicate，但本轮实测接受 BOM、trailing content、leading-zero 与 `1.`，并错误拒绝合法 empty key。 | CommonJS、无 types；2021 最新发布，2022 最近 push；30 日 1,494,464 下载、9 stars。 | **排除。** 小并不等于 strict JSON correct。 |
| `json-parse-ast@1.0.8` | 自有 parser 17,567 B、0 production deps。 | tokenizer 明确支持 comments 与 `\\s`，`parseTokens` 不是 grammar/full-consumption validator。 | CJS、types；2021 最新发布；30 日 674 下载。 | **排除。** 为编辑器 AST 而设计，不是 strict validator。 |
| `json-bigint@1.0.0` | strict parser 12,834 B，但声明 `bignumber.js`；后者 CJS 89,684 B，root 还加载 stringify。 | `strict: true` 源码以 own-property 检出任意 duplicate，但主目标是改变大数表示。 | CJS、无 bundled types；2020 最新发布；30 日 183,168,011 下载。 | **排除。** production tree 与数值语义都超过“只校验 JSON”的需要。 |

`lossless-json` 的 README 宣称 duplicate-key parse error，且其 public API/TypeScript/零依赖与较小 parser source 确实很有吸引力；但本轮直接检查 `4.3.1` 的 `parse.js` 和随包测试后确认，它仅在旧值与新值不 deep-equal 时调用 duplicate handler。`{"a":1,"\\u0061":2}` 会失败，`{"a":1,"\\u0061":1}` 会成功。当前 Change 没有“相同值 duplicate 可接受”的例外，所以不能把它视为等价替代品。该行为和其定位可由 [README](https://github.com/josdejong/lossless-json#readme)、[package artifact](https://registry.npmjs.org/lossless-json/-/lossless-json-4.3.1.tgz) 与 [repository API](https://api.github.com/repos/josdejong/lossless-json) 复核。

`json-dup-key-validator` 是唯一表面上接近 12 KB 且宣称 duplicate validation 的小包，但问题不是“少一个 feature”：其 source 只调用 `_findValue` 而不核对 end position，whitespace 使用 JavaScript `\\s`，并自定义了不符合 JSON 的 empty-key/number 规则；上述临时 Bun 样本也实际复现了这些偏差。因此不能用它加 `JSON.parse` 轻易修复：一旦两套 parser 对合法性不一致，仍要定义哪套结果/位置/错误是事实，且它的 duplicate scanner 本身会扩大审查面。其 [npm artifact](https://registry.npmjs.org/json-dup-key-validator/-/json-dup-key-validator-1.0.3.tgz) 和 [repository API](https://api.github.com/repos/jackyjieliu/json-dup-key-validator) 是复核来源。

##### 新的极简组合候选：native grammar + Clarinet key stream

`clarinet` 不适合作为单独的 strict JSON validator：本轮在 Bun 中直接调用时，`null` root 报错，`{} true` 却正常 end，故不能代替 `JSON.parse`。但这也意味着它不必承担 grammar：合格的最小组合可以按以下顺序工作：

1. bytes 层做 `maximumBytes`、显式 BOM bytes 和 fatal UTF-8；
2. `JSON.parse(text)` 仅作 strict grammar/full-consumption gate，立即丢弃结果；
3. 仅当第一个非 JSON whitespace 字符是 `{` 或 `[` 时，再用 `clarinet.parser()` 扫描原始 text；primitive root 不可能有 object key，无需交给 Clarinet；
4. 用 object-frame `Set<string>` 接收 `onopenobject(firstKey)` 和 `onkey(key)`，在任何第二次 decoded key 时产出 Check-owned duplicate fact；array frame 只维持嵌套；不要公开 Clarinet error/message 或把其 line/column 变成首版契约。

该组合的临时 Bun 样本已经找到 `{"a":1,"a":1}`、`{"a":1,"\\u0061":2}`、nested object 与 array 内 object 的 duplicate，同时接受含 empty key、NUL、lone surrogate/emoji escape 的正常 JSON。这是**组合可行性证据，不是已采用实现**：仍需验证 package root import、private TypeScript declaration/adapter、error settlement、bounded input、Record data、isolated consumer 和足够广的 legal JSON corpus。Clarinet 的公开事件模型和状态限制见其 [README](https://github.com/dscape/clarinet#readme)、[package artifact](https://registry.npmjs.org/clarinet/-/clarinet-0.12.6.tgz) 与 [repository API](https://api.github.com/repos/dscape/clarinet)。

##### 建议与范围决策

**没有一个“极简、现代、单库、零传递依赖”候选同时无条件满足当前所有语义。** 最小路径取决于用户实际想保留的语义：

1. **只校验严格有效 JSON（推荐，若这正是产品目标）：** 不使用库；保留 fatal UTF-8、explicit BOM 和 `JSON.parse`，并把 parse issue 收敛为一个 closed reason。这样是零 package、零 parser feature surface。
2. **保留“任何 decoded duplicate key 都失败”，且优先尺寸：** 先进行 `clarinet` + native grammar gate 的完整项目 spike。它有 23.5 KB 直接 CJS scanner、零传递依赖、不 materialize AST，但比 Momoa 多一次 parse、事件栈和私有 type bridge；首版应省略位置/pointer 等不由其稳定提供的事实。
3. **保留 duplicate、位置/AST 遍历和接入直观性优先：** 继续 Momoa。它约 92.5 KB 的单入口代码面仍是零传递依赖，复杂度更低，但不是体积最小。

因此，本轮将先前“Momoa 是最直接的 single-library 选择”细化为：**若 size 是第一优先级，Clarinet 组合值得先 spike；若只验证有效 JSON，则根本不应引入 parser dependency。** 在用户确认保留 duplicate 与否、以及对位置/Pointer 的需求前，不应安装任一候选或改写 Change。

### Momoa 选型确认与 Bun/candidate 闭合 spike
- 形成时间: 2026-08-24T14:28:56Z

#### 形成时背景

用户在看完“零依赖只校验严格 JSON”“Clarinet 极简组合”与 Momoa 的直接加载面比较后，明确选择 Momoa，并接受其较大的单入口代码面。此前调查只从 npm tarball 和临时样本得到候选判断，尚未把 Momoa 安装为项目 production dependency，也没有证明它能从本项目实际 candidate tarball 的外部 Bun consumer 解析。

本报告形成时，`add-json-validation` 仍未实现 Product runtime；其 Change-local `maximumBytes`、`.json` eligibility、issue cap/truncation、safe Record/final-data schema 与位置公开方式仍未收敛。用户的选择只授权 parser 选型与最小 dependency/spike 闭合，不把这些未决 public-contract choices 静默定为实现默认值。

#### 调查目的

1. 将用户确认的 Momoa 选择与“已安装、已通过严格语义 spike、已进入 candidate dependency closure”区分记录。
2. 在 Bun 与 ancestry-external candidate consumer 中验证 Momoa 的实际 import、strict JSON 行为、decoded duplicate-key AST 语义和位置单位。
3. 记录 license/material 审计所能证明与尚不能证明的边界，避免把 manifest SPDX 字段误作 package legal-material 完成。

#### 调查范围与依据

在本工作区执行 `pnpm add --save-prod @humanwhocodes/momoa@3.3.12`，得到 root `package.json` 和 `pnpm-lock.yaml` 的精确 production dependency；`pnpm why @humanwhocodes/momoa` 显示仅由 `vibe-check@0.1.0 (dependencies)` 引入。然后将相同精确版本加入 `scripts/package/artifact/package-contract.ts` 的 candidate dependency contract，并把 artifact test 的独立 expected manifest literal 同步为该直接依赖。

使用 Bun `1.3.14` 的临时、删除后不保留脚本，以 `{ mode: "json", allowTrailingCommas: false, ranges: true }` 调用 `parse()`：覆盖 `null`、boolean、number、string、array、object root；BOM、comment、trailing comma、trailing content、empty text、unquoted key 与 `NaN` 的拒绝；direct/nested `"a"`/`"\\u0061"` duplicate 的 AST decoded name；以及 emoji 前缀下 `loc.offset`/`range` 与 UTF-8 byte length 的比较。它不实现或调用 Vibe Check 的未来 JSON Check。

运行 `bun test scripts/package/artifact/artifact.test.ts`，并用 temporary state directory 和 ancestry-external temporary consumer 调用现有 `preparePackageCandidate`：candidate tarball 安装后，consumer 从 `@humanwhocodes/momoa` import `parse()`、得到 `['a', 'a']`，且 installed `vibe-check/package.json` 声明该 exact direct dependency。该 consumer 的 manifest 没有 Momoa direct dependency，因此该解析不能来自 repository source 或 consumer manifest。检查实际安装包的 `package.json` 得到 `license: "Apache-2.0"`、`engines.node: ">=18"`，且没有 production dependencies；完整 file inventory 未发现独立 license text。pnpm 在 host Node `26.7.0` 上提示仓库 `engines` 只接受 `>=24 <25`，这是 pnpm host-engine warning，不是 Bun `1.3.14` import failure。

#### 调查结果与边界

**已确认和已执行。** 用户选择已写入 active/unaligned Decision 和 active Change；Momoa 现在是 root 与 candidate manifest 的精确 production dependency。Bun 实测 ESM import 成功，strict matrix 中六种合法 root 都成功、上述七种非严格输入都抛错。Momoa 不把 duplicate 视为 parse error，而是保留每个 `Object.members` 的 decoded name，因此 owning adapter 可以在 materialization 前将 direct 与 nested escaped duplicate 归一化为 Check-owned issue。候选 tarball 在临时外部 Bun consumer 中携带并解析了相同版本，证明 source workspace 的 ambient installation 不是这项结论的依据。

**位置语义。** emoji 样本中第二个 member 的 source UTF-16 index、Momoa `loc.start.offset` 与 `range[0]` 都是 `10`，而其前缀 UTF-8 bytes 是 `12`。因此若首版公开位置，必须明确为 UTF-16 code-unit offset，或在 Change 的 open question 中选择不公开位置；不能把 Momoa offset 标成 byte offset。

**license/material 结果。** `Apache-2.0` manifest 是可复核的 package metadata，足以进入后续 license review；但已安装 tarball 不包含 separate license text，且本项目尚未把该 third-party material 纳入 candidate legal inventory。故不能把 SPDX metadata 说成完整 license/material closure，也不能把 Decision 标为 aligned。

**仍未验证与不应外推。** 本轮没有实现 private strict-document helper、bounded read、safe Record/final data、four-state settlement、issue cap/pointer semantics 或 public `jsonValidation`；未修改 Product semantic Cases；未跑完整 `typecheck`、`lint`、required/full Gate 或 benchmark Momoa 的 AST memory/throughput。严格 parser 的 direct behavior 不能替代最终 Check contract。库选型调查本身到此结束；上述 implementation/contract work 由 Change 和 Decision owner 继续承接，若 Momoa 版本、Bun compatibility 或内存预算改变，需要重新调查。
