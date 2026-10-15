---
title: "严格 JSON 解析器替换的收益与维护边界复查"
id: "261015-evaluate-strict-json-parser-replacement"
formedAt: "2026-10-15T02:08:26Z"
question: "在保留当前严格 JSON、安全值和结果契约时，原生解析组合是否比 Momoa 更值得采用，替换决定还需要哪些证据？"
tags:
  - "implementation-libraries"
  - "json-validation"
  - "performance"
relations:
  - type: "复查"
    target: "260824-confirm-momoa-with-bun-and-candidate-spike"
    summary: "在当前契约和运行时下复核原生组合的收益与替换边界"
---

## 形成时背景

整体优化后，用户要求单独评估严格 JSON 解析器的替换价值，采用前另行讨论。
调查基线为 `fc584f2bd52ad60da9d80d05bbe8097da4c6c57e`，使用 Momoa 3.3.12；
[现有决定](../decisions/use-momoa-for-strict-json-document-boundary.md)接受 AST 成本，换取直接可审计的重复键证据。

[前序调查](confirm-momoa-with-bun-and-candidate-spike.md)完成于 2026-08-24，早于完整 Check 实现。
本轮在已有严格文档边界、Schema 消费者和结果契约的条件下复查选型。

## 调查目的

判断“原生 `JSON.parse`＋解码键查重＋安全值投影”（下称原生组合）是否值得替换 Momoa，
为单独的采用讨论提供收益、行为覆盖和维护责任依据。比较保持既定契约、并发与预算。

## 调查范围与依据

### 已核对的替换边界

| 对象与 owner | 本轮核对范围 |
| --- | --- |
| [私有文档边界](../../src/package-checks/json-document/strict-document.ts) | 受限 fresh read/byte limit，随后 BOM → fatal UTF-8 → 完整语法 → 解码键查重；非语法内部失败归入 `unavailable`。 |
| 私有值 | 对象为 null-prototype，全部对象与数组冻结；保留特殊属性名、负零、数值溢出语义，对外隐藏原文、AST、键名和错误细节。 |
| [JSON Check](../checks/json-validation.md) | 文件选择、顺序让步、取消、已接受 Records、五计数与 final-data。 |
| [Schema Check](../checks/json-schema-validation.md) | 本地 schema、instance 与受控远端引用共用文档边界；scope、transport、engine 与结果仍归该 Check。 |
| [包材料](../tooling/package-artifact.md)与现有决定 | parser 属于私有实现；替换涉及依赖、release manifest、artifact 预期契约和采用理由。 |

调用关系由 CodeGraph 定位后读取实现。取证于 2026-10-15，环境为 Linux x64、CPU quota 4、内存限额 6 GiB，
Node 24.18.0 / Bun 1.3.14；registry 精确查询时点见快照。

### 方法与证据层级

- **输入：** 固定基线的全部 tracked `docs/**/*.json`，共 449 份、31,434,902 bytes，最大单份 1,772,432 bytes，
  均在 Gate 现有 2 MiB 上限内；另测宽对象、数字数组、长转义字符串和末尾同值重复键。
- **性能：** 每宿主 5 对独立新进程，A/B、B/A 交错、全程串行；每进程预热一轮、计时一轮。
  计时覆盖已读 bytes 的 BOM、解码、解析、查重及冻结，文件 IO、Check/Run 和启动在计时之外。
- **行为：** 两宿主各对照 3547 个输入，独立断言语法优先、同值/转义键重复、BOM/UTF-8、负零/溢出与冻结属性描述符；
  深度压力探针单列。现有 Product JSON/Schema tests 为 24/24，证明基线而非原型集成。
- **现成库：** 筛查版本、接口与已知语义；替代包仅查公开材料，未安装、执行或参与性能排名。

需要复核测量口径或重放时读随附 METHODS；核对数字读统计 CSV 与 `evidence.json`，核对算法读对照和原型源码。

## 调查结果与边界

**建议将原生组合列为优先候选，单独决定项目是否长期拥有私有查重扫描器。**
本轮原型证明了局部收益与已测范围的一致性；采用仍需集成验收，形成时继续保留 Momoa。

### 方案筛查

| 方案 | 本轮证据 | 选型含义 |
| --- | --- | --- |
| Momoa 3.3.12 | 已有实现与包验收；AST 保留每个成员，adapter 判重。 | 改动风险最低，继续支付 AST 与转换成本。 |
| Momoa 3.3.13 | 查询时最新版；两版 root ESM 均为 92,472 bytes，SHA-256 相同。 | 入口解析 JS 未变，升级不能解释为该路径的性能优化。 |
| 原生组合（迭代冻结版） | 两宿主普通矩阵无差异，五类输入均有中位数收益。 | 项目承担词法定位、容器栈与解码键集合的正确性。 |
| jsonc-parser 3.3.1 | 提供解码属性名 visitor；容错解析须结合完整 errors 判定严格成功。 | 第三方维护 lexer 的后备方案，仍需错误优先级、对象栈与安全值适配；收益待实测。 |
| lossless-json 4.3.1 | 同值重复成员绕过 duplicate handler。 | 该版本不满足同值重复键也须拒绝的要求。 |
| Clarinet 0.12.6＋原生语法验收 | 本轮只复核 manifest；前序方案需原生完整验收、事件栈与额外扫描。 | 采用优先级缺少本轮行为、性能证据。 |

原生 `JSON.parse` 会覆盖同名成员，查重需要保留原文证据，见
[ECMAScript JSON.parse](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse)。
jsonc-parser 的宽容行为和 visitor 来自其 [3.3.1 README](https://github.com/microsoft/node-jsonc-parser/blob/v3.3.1/README.md)；
lossless-json 的同值分支由 [4.3.1 parse 源码](https://github.com/josdejong/lossless-json/blob/v4.3.1/src/parse.ts#L69-L85)直接确认。
registry 快照与 Momoa tarball 比对随附；92 KB 表示入口 JS 代码面，与运行内存或依赖树体积不同。

### 性能归因与收益

独立阶段探针中，Momoa 的 parse/AST 阶段约占仓库语料所测阶段 wall time 的 69%（Bun）和 75%（Node），
支持优先优化解析路径；探针粒度尚不能区分 AST 分配、tokenizer 与 GC 成本。

以下为每条件 5 样本的 wall median，单位 ms，覆盖完整 bytes-to-safe-value 边界：

| 输入组 | Bun：Momoa → 原生组合 | Node：Momoa → 原生组合 |
| --- | ---: | ---: |
| 仓库 449 份 JSON，31.43 MB | 1366.25 → 435.98 | 747.18 → 250.41 |
| 4096-key 宽对象，16 份 | 79.25 → 22.42 | 40.93 → 28.28 |
| 32768-number 数组，8 份 | 226.39 → 165.52 | 55.40 → 9.76 |
| 长转义字符串，8 份 | 42.92 → 24.41 | 35.09 → 15.14 |
| 末尾同值重复键，16 份 | 79.25 → 18.13 | 39.01 → 19.47 |

仓库输入组的 wall 降低约 68.1% / 66.5%，CPU median 为 Bun 1686.63 → 460.90 ms、
Node 1045.01 → 253.21 ms。其它形状收益不同；原生组合仍需全文键扫描与容器冻结。

整 worker peak RSS median 为 Bun 511.04 → 353.88 MiB、Node 464.89 → 274.45 MiB；
它包含语料、模块、预热、JIT 与先前输入组，是进程级观察而非 parser 独占 heap。

**外推边界：** 仓库语料包含较大的历史调查 JSON，偏离普通小配置文件分布；5 对样本支持本轮中位数比较，
尚不足以判断可靠 P95、完整 Gate 收益或生产内存。原始样本、min/max 与阶段观察均随附。

### 等价性与探索转折

1. 初版先由原生解析器验收完整语法，再扫描原文判重，最后递归复制为冻结 null-prototype 值。
   两宿主普通矩阵均无差异，但 Node 的 depth=4096 合法输入在对照中成功、初版却 unavailable。
2. 修订版用显式栈处理新解析且未暴露的私有值，将对象设为 null-prototype 并冻结全部容器。
   Node depth=4096 的退化消除；两宿主各 3547 输入保持结果、值与安全属性描述符一致。
3. depth=16384 时，修订版成功、Momoa 对照 unavailable。这是容量差异而非公开深度承诺，
   与普通矩阵的一致性分别记录。

扫描器只在完整语法验收后工作：跳过字符串、识别键后的冒号、维护对象/数组栈，用原生字符串解码比较转义键。
因此“重复键后还有语法错误”仍优先返回 `invalid-json`。该边界为同步调用，取消由所属 Check 在可观察边界处理，
单文档内部不支持抢占。

### 待决事项与采用门槛

待决事项是查重扫描器的长期维护归属；本轮保持现有 Product、依赖和 Decision。

- **项目承担：** 单独决定后，通过实施 Change 推进原生组合。原生解析器负责完整语法，
  查重与安全投影归既有私有文档边界。
- **第三方承担词法实现：** 保留 Momoa；若要继续比较收益，再对 jsonc-parser visitor 补同口径原型验证。

采用前还需完成：

1. bytes/read/issue 与所有消费者的完整行为验收，覆盖 Schema 本地/远端边界、取消、Records、计数与 `unavailable`。
2. 依赖与 release manifest 更新，以及 artifact、isolated consumer 和完整 Gate 验收；同口径复测 wall/CPU。

跨版本 fuzz、完整 Unicode 范围、冷启动与生产内存仍属未验证范围。

## 随附资源

- [取证与重放方法](./_resources/261015-evaluate-strict-json-parser-replacement/METHODS.md)
- [固定语料身份](./_resources/261015-evaluate-strict-json-parser-replacement/corpus-manifest.csv)
- [语料与变体构造](./_resources/261015-evaluate-strict-json-parser-replacement/corpus.ts)
- [环境、验证与归因摘要](./_resources/261015-evaluate-strict-json-parser-replacement/evidence.json)
- [吞吐量汇总](./_resources/261015-evaluate-strict-json-parser-replacement/measurements-summary.csv)
- [Momoa 两版入口比对](./_resources/261015-evaluate-strict-json-parser-replacement/momoa-artifact-comparison.json)
- [当前实现对照与阶段探针](./_resources/261015-evaluate-strict-json-parser-replacement/momoa-control.ts)
- [修订后的迭代原型](./_resources/261015-evaluate-strict-json-parser-replacement/native-iterative-prototype.ts)
- [初版递归原型](./_resources/261015-evaluate-strict-json-parser-replacement/native-prototype.ts)
- [阶段原始观察](./_resources/261015-evaluate-strict-json-parser-replacement/phase-samples.csv)
- [阶段测量入口](./_resources/261015-evaluate-strict-json-parser-replacement/phases.ts)
- [固定 revision 语料提取](./_resources/261015-evaluate-strict-json-parser-replacement/prepare-corpus.py)
- [当前 registry 快照](./_resources/261015-evaluate-strict-json-parser-replacement/registry-snapshot.json)
- [串行交错测量入口](./_resources/261015-evaluate-strict-json-parser-replacement/run-measurements.py)
- [完整吞吐量样本](./_resources/261015-evaluate-strict-json-parser-replacement/samples.csv)
- [资源字节身份](./_resources/261015-evaluate-strict-json-parser-replacement/source-manifest.sha256)
- [初版行为对照](./_resources/261015-evaluate-strict-json-parser-replacement/verify-recursive.ts)
- [修订版行为对照](./_resources/261015-evaluate-strict-json-parser-replacement/verify.ts)
- [独立 worker](./_resources/261015-evaluate-strict-json-parser-replacement/worker.ts)
