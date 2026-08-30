---
title: "依赖实际加载面与零依赖严格 grammar 路径"
formedAt: "2026-08-24T13:38:49Z"
question: "在 Vibe Check 的 `add-json-validation` Change 中，哪个库能以最小 adapter 在 Bun 中验证严格 JSON 并可靠检测 decoded duplicate key，同时怎样在热度、生态、接入复杂度与运行时重量之间取舍？"
tags:
  - "implementation-libraries"
  - "json-validation"
relations:
  - type: "修正"
    target: "choose-minimal-library-for-strict-json-and-duplicate-keys.md"
---

## 形成时背景

用户质疑前一轮报告中的约 200 KB 数字是否把“整包大小”误当成了实际依赖，并澄清其预期可能只是“校验 JSON 有效”，而非使用高级 parser 功能。当前 Change 仍明确把 decoded duplicate key、BOM、comments、trailing comma、trailing content、位置/指针和 closed issue reasons 作为 strict-document boundary 的一部分；因此“只校验 JSON 有效”的意图与当前已规划的验收语义存在需要明确处理的范围差异。

本轮工作区仍基于 Git `36bdeea01add43b8044bb6431d030315384ce086`，且保留先前未提交的 Change Plan 与调查文件改动。本轮没有安装依赖、写入 lockfile、修改 Change、实现 runtime 或运行 package candidate；仅对候选 npm tarball 和入口模块做只读检查，并在现有 Bun 上运行内建 API 的临时 stdin 样本。

## 调查目的

1. 将 npm 整包分发大小、生产依赖树大小与 Bun 直接 root import 的静态模块加载面区分开来，纠正前一轮“重量”指标的解释边界。
2. 判断若产品只需要严格 JSON document 有效性，能否完全不引入第三方 dependency。
3. 明确当前 Change 中哪些已规划能力是实现“有效 JSON”所必需的，哪些是额外产品语义，以及用户需要作出的最小范围决定。

## 调查范围与依据

**候选 artifact 检查。** 于本报告形成时间，从 npm registry 的 latest tarball 元数据下载并临时解包 `@humanwhocodes/momoa@3.3.12`、`jsonc-parser@3.3.1` 与 `json-parse-even-better-errors@6.0.0`，统计压缩 tarball、整个解包目录和 package root ESM entry 的静态 JavaScript 闭包。Momoa 的 `package.json` 只公开 root import/require；其 ESM root 为 `dist/momoa.js`。`jsonc-parser` 的 ESM root `lib/esm/main.js` 静态导入 parser、scanner、format、edit 与 string-intern 模块。计数是磁盘 source bytes，不是 tree-shaken bundle、Bun 编译缓存、运行时常驻内存、冷启动或解析峰值内存。来源为 [Momoa registry manifest](https://registry.npmjs.org/%40humanwhocodes%2Fmomoa/3.3.12)、[jsonc-parser registry manifest](https://registry.npmjs.org/jsonc-parser/3.3.1) 与 [json-parse-even-better-errors registry manifest](https://registry.npmjs.org/json-parse-even-better-errors/6.0.0)。

**内建 API 样本。** 在本工作区的 Bun `1.3.14` 上，以临时 stdin 脚本调用 `new TextDecoder("utf-8", { fatal: true })` 和 `JSON.parse`：`{}`、`null` 成功；非法 UTF-8 产生 `TypeError`；leading U+FEFF、line comment、trailing comma 与 trailing content 都产生 `SyntaxError`；`{"a":1,"\\u0061":2}` 成功并得到 `{ "a": 2 }`。该实验只证明该版本这些输入的行为，不替代跨版本或产品集成验证。

**语义依据与范围。** [RFC 8259 §4](https://www.rfc-editor.org/rfc/rfc8259#section-4) 的对象 grammar 允许重复成员名，而名字唯一性使用的是 `SHOULD`，不是 `MUST`；名称不唯一时接收方行为不可预测。故 decoded duplicate-key 拒绝是一项有价值的更严格产品语义，但不是完成 UTF-8 + JSON grammar + 完整消费校验的前提。当前 Change 文件中仍把它列为必须失败的领域 issue，本报告不会擅自删除该要求。

## 调查结果与边界

### 已确认：前一轮的 200 KB 不是传递依赖树

三项不同的“大小”不可混为一谈：

| 路径 | 新增 production 依赖 | 压缩 tarball | 整包解压大小 | Bun 的 root ESM import 静态 JS 闭包 | 含义 |
| --- | ---: | ---: | ---: | ---: | --- |
| 原生 `TextDecoder` + `JSON.parse` | 0 | 0 | 0 | 0 | Bun/JavaScript 内建能力，不新增 package。 |
| `@humanwhocodes/momoa@3.3.12` | 0 | 46,812 B | 232,033 B | 92,472 B | 整包还含 CJS 副本、types、README 和许可证；root ESM 是单一 bundle，没有仅 `parse` 的公开 subpath。 |
| `jsonc-parser@3.3.1` | 0 | 27,354 B | 212,821 B | 75,061 B | root ESM 会静态带入 parser、scanner、formatter 与 editor 实现；整包还含声明、CJS/UMD 等发布材料。 |
| `json-parse-even-better-errors@6.0.0` | 0 | 4,561 B | 10,230 B | 4,204 B | 很小，但包装 `JSON.parse`，不能保留 duplicate-key 证据，且会去除 BOM。 |

因此，前一轮两个“约 200 KB”是**整个 npm 包解压后的文件总量**，不是“安装以后还会拉取约 200 KB 的依赖”。Momoa 和 jsonc-parser 的 production dependency 数都为零。对当前 Bun Product runtime，普通 package import 不是构建产物的 tree-shaking 场景；应把上表的 root-import 静态闭包当作较保守的直接代码加载面，而不能假设只因写了 `import { parse }` 就只运行或交付一个 parse-only 子模块。实际内存、启动时间和未来 Bun resolver 行为尚未 benchmark，不能由字节数外推。

### 若“有效 JSON”只指严格字节和 grammar，零依赖足够

最小可审计路径是：在读取的 `Uint8Array` 上先显式检查 UTF-8 BOM bytes，再以 fatal `TextDecoder` decode，最后调用 `JSON.parse(text)`；不使用或公开其 native message。它可接受所有 JSON root value，并在本轮 Bun 样本中拒绝无效 UTF-8、BOM、comments、trailing comma 与 trailing content。它不需要 Ajv、JSON Schema、AST、formatter 或 parser library。

但原生路径也有明确上限：

- `JSON.parse` 已将 `"a"` 和 `"\\u0061"` 归并为同一个属性，无法再检测 decoded duplicate key；
- 它不能从稳定 API 提供 member-level pointer、重复项位置或 parser token/AST；
- 若继续保留 `syntax` 与 `trailing-content` 等细粒度 closed reason，而又不读取 native error wording，则需另行定义/实现分类规则。将所有 parse failure 归为一个 closed `invalid-json` reason 才是与“只验证有效性”一致的简化。

这说明外部 parser 并非“验证 JSON 有效”所必需；它只是在保留当前 Change 的重复 key、定位和细粒度错误语义时，替代自写 tokenizer/parser 的较小实现成本。

### 小而窄的 duplicate-key 包不构成更安全的默认选择

另外检查了 `json-dup-key-validator@1.0.3`：其 registry 标示 tarball 5,793 B、解包 20,742 B、主 CommonJS source 约 12 KB，但它有一个 production dependency、没有 TypeScript 声明，latest 发布于 2021-02，且本轮没有以 `"a"`/`"\\u0061"`、BOM、完整消费和 Bun 运行矩阵证明其行为。它的尺寸不足以抵消这些未闭合的正确性/维护风险，不能仅因更小就替代 Momoa。相关版本与 dependency 数据见其 [npm registry manifest](https://registry.npmjs.org/json-dup-key-validator/1.0.3)。

### 建议与待决范围

**推荐的产品取舍：** 如果用户的真实 v1 要求就是“文件是严格有效 JSON”，推荐把 Change 收窄为零依赖的 fatal UTF-8 + explicit BOM + `JSON.parse` boundary，并同步删除 decoded duplicate-key、member pointer/position 以及依赖这些语义的细粒度 issue/测试义务。这样没有外部 runtime dependency，也不引入高级 parser 功能。

这不是纯实现优化：当前 proposal/design/tasks 明确要求 decoded duplicate-key 失败并要求后续 JSON Schema Check 复用同一语义。因此在用户确认前，本轮没有改写 Change 或开始实现。

若用户决定**保留** duplicate-key 为 error，Momoa 的实际 root ESM 代码面约 92 KB、production dependency 为零，仍是相对轻的“库 + 薄 adapter”方案；它的多余 AST/print/traverse 代码是单一 public entry 的代价，而不是重型传递依赖。此时应先完成已列出的 Bun spike，再授权安装并实现。若用户决定**删除** duplicate-key，下一步应先将 Change Plan 的 outcome、design、tasks 和验收案例同步收窄，再直接以零依赖实现；不应把当前计划默默降级。

**仍未验证的边界。** 未测原生路径在本项目完整 callback、safe Record/four-state settlement、`maximumBytes` 与 isolated consumer 中的表现；未 benchmark 大文件、深层 JSON 或 AST 内存；也未实测 Momoa/jsonc-parser 的安装、license 归档、Bun import 和 candidate artifact。这些工作仅在用户选定保留或移除 duplicate-key 语义后才有明确的最小实施路径。
