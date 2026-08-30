---
title: "严格 JSON 与重复 key 的最小库选择"
formedAt: "2026-08-24T13:12:21Z"
question: "在 Vibe Check 的 `add-json-validation` Change 中，哪个库能以最小 adapter 在 Bun 中验证严格 JSON 并可靠检测 decoded duplicate key，同时怎样在热度、生态、接入复杂度与运行时重量之间取舍？"
tags:
  - "implementation-libraries"
  - "json-validation"
relations: []
---

## 形成时背景

用户希望确认 `add-json-validation` 是否可以保持为“成熟库加薄 adapter”的小型实现，并明确要求先调查库的热度、生态、复杂度与重量。当前 Change 仍是 active Plan，目标是严格验证 UTF-8、完整 JSON grammar、BOM/comments/trailing comma/trailing content 和 decoded duplicate key；它不是 JSON Schema Check，也不允许公开 parser/AST 或原始 document。

本轮工作区基线是 Git `36bdeea01add43b8044bb6431d030315384ce086`。形成时有未提交的 `changes/add-json-validation/{.change-plan.json,proposal.md,design.md,tasks.md}` 计划材料改动；本调查不修改这些材料，也不表示已经采用候选。根 `package.json` 只有 `ajv` devDependency，且未锁定本调查的专用 JSON document parser。若未来采用外部库，它必须作为 package production dependency 完成 license、candidate artifact 与 isolated consumer 闭合。

## 调查目的

1. 判断能否用第三方库加薄 adapter 实现 v1，而无需先写完整 JSON parser。
2. 比较候选在严格 JSON、decoded duplicate-key、位置、Bun/TypeScript、维护/采用信号、接入复杂度和分发重量上的适配度。
3. 给出一个**推荐但尚未采用**的候选，以及足以把推荐升级为实施选择的最小本地 spike。

本报告不授权安装依赖、修改 lockfile、调整 Change scope、更新 Decision 或实现 Product runtime。

## 调查范围与依据

**项目事实。** 审阅了当前 `changes/add-json-validation/{proposal.md,design.md,tasks.md}`、`package.json`、`docs/decisions/complete-first-release-check-set-before-publication.md`，以及 package candidate 的 dependency-audit/isolated-install 实现。项目事实表明：候选需要进入 production dependency closure，不能靠开发环境或祖先 `node_modules` 满足。

**外部能力依据。** 仅使用候选维护者、npm 与 ECMAScript 的一手资料：

- [Momoa JavaScript README](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/README.md)、[package manifest](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/package.json)、[parser source](https://raw.githubusercontent.com/humanwhocodes/momoa/main/js/src/parse.js)、[npm registry](https://registry.npmjs.org/%40humanwhocodes%2Fmomoa)、[npm downloads API](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/%40humanwhocodes%2Fmomoa) 与 [GitHub repository API](https://api.github.com/repos/humanwhocodes/momoa)；
- [jsonc-parser README](https://raw.githubusercontent.com/microsoft/node-jsonc-parser/main/README.md)、[parser source](https://raw.githubusercontent.com/microsoft/node-jsonc-parser/main/src/impl/parser.ts)、[npm registry](https://registry.npmjs.org/jsonc-parser)、[npm downloads API](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/jsonc-parser) 与 [GitHub repository API](https://api.github.com/repos/microsoft/node-jsonc-parser)；
- [json-source-map registry](https://registry.npmjs.org/json-source-map)、[source](https://raw.githubusercontent.com/epoberezkin/json-source-map/master/index.js)、[json-parse-even-better-errors README](https://raw.githubusercontent.com/npm/json-parse-even-better-errors/main/README.md)、[其 npm registry](https://registry.npmjs.org/json-parse-even-better-errors)，以及 [ECMAScript `JSON.parse` specification](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse)。

**观测方式与限制。** 外部数据观测于 `2026-08-24T13:11:26Z`；下载量是 `2026-07-25` 至 `2026-08-23` 的 30 个完整 UTC 日 npm downloads API 值。latest version、发布时刻、license、production dependency 数和 `unpackedSize` 来自 npm registry；stars、默认分支最近 push 与 archived 状态来自 GitHub API。下载量包含 transitive install、CI 与镜像，stars 也不代表安全性、正确性或本项目适配。`unpackedSize` 是安装面代理，不是 tree-shaken bundle、Bun 产物或常驻内存测量。本轮没有安装候选、跑 benchmark、执行 Bun import、做漏洞/SBOM/许可证法务审计或测量 AST 内存。

## 调查结果与边界

### 已确认事实

1. **库加 adapter 足够，`JSON.parse`/Ajv 单独不够。** `JSON.parse` 在构造对象时会覆盖词法上较早的同名属性；因此它、reviver 和接收已构造 data 的 Ajv 都不能事后发现 `{"a": 1, "\\u0061": 2}`。Ajv 也不是此 Change 所需的任意 raw JSON document parser。它可继续服务独立 JSON Schema Change，但不替代 strict-document boundary。
2. **候选必须保留对象成员，而不能只返回 JavaScript object。** 否则 duplicate-key 证据在 adapter 之前已丢失。对于本 Change，strict grammar、完整消费、decoded key、位置与安全错误归一化是一个边界；热度高但在这些点失真的库不能因体积小而入选。
3. **当前工作量可保持很小。** 推荐路径是：读取并作 fatal UTF-8 decode / BOM 检查，再用库 parse，再遍历每个 object 的成员建立局部 `Set<string>`，最后把库的错误归一化为 Check-owned reason/data。它不需要公开 AST、引入通用 validation framework 或自写完整 JSON grammar parser。

### 候选对照

| 候选（观测时 latest） | 严格 JSON 与 duplicate-key 适配 | 热度与生态快照 | 复杂度与重量代理 | 结论 |
| --- | --- | --- | --- | --- |
| **`@humanwhocodes/momoa@3.3.12`** | 默认 `mode: "json"`，默认不允许 trailing comma；parse 产生保留每个 object member 的 AST，key 是 decoded string value，并有 location/offset。README 明列 Bun 安装与 ESM import。 | 13,763,253 次 30 日下载；2026-08-21 发布/最近 push；357 stars；未归档。 | 0 production deps、Apache-2.0、`unpackedSize` 232,033 B。adapter 只需 parse + 遍历 object members；代价是每个输入会 materialize AST，未做真实内存测量。 | **推荐。** 在本次四个候选中最直接满足 strict JSON、decoded duplicates、位置与 Bun 线索。 |
| **`jsonc-parser@3.3.1`** | `visit` 提供 decoded property、offset/line/column；以 object stack 可检测重复。可配置 `disallowComments` 并拒绝 trailing comma/empty content，但库是 fault-tolerant parser，adapter 必须把任何 parse error 判为失败。 | 236,571,777 次 30 日下载；2024-06-24 最近 npm 发布、2026-08-12 最近 push；754 stars；未归档。 | 0 production deps、MIT、`unpackedSize` 212,821 B。SAX-style `visit` 可能避免持久 AST，但本轮未测内存；严格选项/error handling 比 Momoa 多一个容易遗漏的适配面。未找到维护者的 Bun 专门说明。 | **可行备选。** 采用信号最高且轻，但其 JSONC/容错定位让 strict adapter 更需谨慎。 |
| `json-source-map@0.6.1` | 自有 parser/位置能力，但其 object evaluation 以 key 覆盖先前值，不能保留两个相同或 decoded-equivalent 成员。 | 4,659,751 次 30 日下载；2019-08-07 最近 npm 发布、2024-02-25 最近 push；76 stars。 | 0 production deps、MIT、`unpackedSize` 39,950 B。 | **排除。** 最小分发体积无法弥补 duplicate-key 证据丢失，维护也明显较旧。 |
| `json-parse-even-better-errors@6.0.0` | 包装 `JSON.parse`，README 说明会去除 leading BOM；因此既不能拒绝 BOM，也不能观察已覆盖的 duplicate key。 | 434,671,160 次 30 日下载；2026-05-08 最近 npm 发布、2026-06-18 最近 push；27 stars。 | 0 production deps、MIT、`unpackedSize` 10,230 B。 | **排除。** 高下载和极小安装面只说明普适错误包装需求，不满足本 Change 的核心 document 语义。 |

### 推荐、未采用状态与最小 spike

**推荐（尚未采用）：** 选择 `@humanwhocodes/momoa@3.3.12`，并用 package-private adapter 维护本 Change 的 closed reason、safe path/pointer/key/location 和 Record identity。它让 v1 保持“库加薄 adapter”，而不是把 JSON parsing 发展为 Vibe Check 的公共能力。

**为什么不是仅按热度选 `jsonc-parser`：** 后者是合理备选，并且下载量远高于 Momoa；但它明确是 JSON-with-comments、fault-tolerant parser。对于本 Change 的 fail-closed strict JSON，adapter 必须额外完整处理 options 与 errors。Momoa 默认语义和 AST model 更接近实际问题，因此预期实现/审查复杂度更低。该判断是基于公开 API 的推断，不是 benchmark 结论。

**必须先完成的最小 spike：**

1. 在受授权的依赖变更中临时接入 Momoa，验证 Bun ESM import、production dependency 和 candidate artifact resolution；本报告未执行该操作。
2. 验证所有合法 root（`null`、boolean、number、string、array、object）以及 BOM、comments、trailing comma、trailing content、empty text 的拒绝路径。
3. 遍历每个 `Object.members`，覆盖直接/嵌套重复与 `"a"`/`"\\u0061"` decoded duplicate；确认只保留安全 key/path/位置，不传播库的 Error 或原始文本。
4. 用 emoji 前缀样本确认 library offset 的单位；若无法稳定定义公共位置契约，首版省略位置字段。
5. 只有 spike 通过后，才把候选加入 production dependency、更新 lockfile、完成 license/material、isolated consumer、semantic Case 和 Gate 验证。

**残余边界。** 推荐不等于 Bun 实际运行已通过，也不证明 Momoa 的 AST 对最终 `maximumBytes` 默认足够轻。若用户选择很大的 byte limit 或要求低内存流式处理，应先测量真实 fixtures；届时 `jsonc-parser` 的 visitor path 值得重新比较。若 Momoa 的 spike 失败，先用同一案例矩阵验证 `jsonc-parser`，而不是直接开始自写 parser。
