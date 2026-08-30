---
title: "极简候选复核：保留 duplicate-key 时的最小可行面"
formedAt: "2026-08-24T13:59:46Z"
question: "在 Vibe Check 的 `add-json-validation` Change 中，哪个库能以最小 adapter 在 Bun 中验证严格 JSON 并可靠检测 decoded duplicate key，同时怎样在热度、生态、接入复杂度与运行时重量之间取舍？"
tags:
  - "implementation-libraries"
  - "json-validation"
relations:
  - type: "补充"
    target: "recheck-json-dependency-and-zero-dependency-path.md"
---

## 形成时背景

用户继续追问是否存在“极简”库，而不是接受前一轮的 Momoa/jsonc-parser。此前已确认：若只需严格 JSON document 有效性，Bun 内建 API 已可零依赖完成；但当前 Change 仍要求**所有** decoded duplicate key（包括值相同者）失败。因此本轮把“极简”限定为：在不把 grammar correctness 交给脆弱 regex/scanner 的前提下，尽量小地保留 duplicate-key 证据。

本轮没有在工作区安装 package 或写入 lockfile。为避免把 npm 分发体积误作运行时重量，候选均从 npm tarball 临时解包于系统临时目录，检查入口源码/manifest 后删除；随后仅在 Bun `1.3.14` 的临时脚本中运行无依赖候选。任何 Bun 试验结果都不等于本项目的 installed-runtime、candidate artifact 或 isolated-consumer 验证。

## 调查目的

1. 寻找比 Momoa 更小、同时仍可支撑当前 strict JSON + decoded duplicate-key 语义的候选。
2. 分辨“单独看起来很小”的库是否真的完成 strict grammar、全部 root、完整消费、BOM 和 escaped key 的要求。
3. 在“只校验有效 JSON”“体积最小”和“保持当前 duplicate-key 要求”之间给出可执行的选择边界。

## 调查范围与依据

**筛选与 artifact 方法。** 检查 npm 搜索结果和候选 latest tarball 的 production manifest、公开入口、源码字节数及 source 行为；下载计数均是 `2026-07-25` 至 `2026-08-23` 的 30 个完整 UTC 日。候选涵盖 `lossless-json`、`clarinet`、`json-dup-key-validator`、`json-parse-ast`、`json-bigint`，以及只作对照的原生 API。npm registry、downloads API 与 GitHub repository API 是版本、依赖、大小、发布时间和维护快照的依据；相关直接入口见 [lossless-json registry](https://registry.npmjs.org/lossless-json)、[clarinet registry](https://registry.npmjs.org/clarinet)、[json-dup-key-validator registry](https://registry.npmjs.org/json-dup-key-validator)、[json-bigint registry](https://registry.npmjs.org/json-bigint)、[lossless-json downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/lossless-json)、[clarinet downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/clarinet) 与 [json-dup-key-validator downloads](https://api.npmjs.org/downloads/point/2026-07-25:2026-08-23/json-dup-key-validator)。

**行为样本。** 对每个可运行候选，最小矩阵至少涵盖：BOM、comments、trailing comma、trailing content、合法 primitive root、`"a"`/`"\\u0061"`，以及值相同与不同的 duplicate。对 `clarinet` 还验证了 nested object/array、empty key、NUL、lone surrogate 与 emoji escape；在先经 `JSON.parse` 成功的 object/array 输入上，事件栈能检出相同值、escaped 和 nested duplicate。没有做随机模糊测试、性能/内存 benchmark、漏洞/SBOM 审计或完整项目集成。

## 调查结果与边界

### 结果总览

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

### 新的极简组合候选：native grammar + Clarinet key stream

`clarinet` 不适合作为单独的 strict JSON validator：本轮在 Bun 中直接调用时，`null` root 报错，`{} true` 却正常 end，故不能代替 `JSON.parse`。但这也意味着它不必承担 grammar：合格的最小组合可以按以下顺序工作：

1. bytes 层做 `maximumBytes`、显式 BOM bytes 和 fatal UTF-8；
2. `JSON.parse(text)` 仅作 strict grammar/full-consumption gate，立即丢弃结果；
3. 仅当第一个非 JSON whitespace 字符是 `{` 或 `[` 时，再用 `clarinet.parser()` 扫描原始 text；primitive root 不可能有 object key，无需交给 Clarinet；
4. 用 object-frame `Set<string>` 接收 `onopenobject(firstKey)` 和 `onkey(key)`，在任何第二次 decoded key 时产出 Check-owned duplicate fact；array frame 只维持嵌套；不要公开 Clarinet error/message 或把其 line/column 变成首版契约。

该组合的临时 Bun 样本已经找到 `{"a":1,"a":1}`、`{"a":1,"\\u0061":2}`、nested object 与 array 内 object 的 duplicate，同时接受含 empty key、NUL、lone surrogate/emoji escape 的正常 JSON。这是**组合可行性证据，不是已采用实现**：仍需验证 package root import、private TypeScript declaration/adapter、error settlement、bounded input、Record data、isolated consumer 和足够广的 legal JSON corpus。Clarinet 的公开事件模型和状态限制见其 [README](https://github.com/dscape/clarinet#readme)、[package artifact](https://registry.npmjs.org/clarinet/-/clarinet-0.12.6.tgz) 与 [repository API](https://api.github.com/repos/dscape/clarinet)。

### 建议与范围决策

**没有一个“极简、现代、单库、零传递依赖”候选同时无条件满足当前所有语义。** 最小路径取决于用户实际想保留的语义：

1. **只校验严格有效 JSON（推荐，若这正是产品目标）：** 不使用库；保留 fatal UTF-8、explicit BOM 和 `JSON.parse`，并把 parse issue 收敛为一个 closed reason。这样是零 package、零 parser feature surface。
2. **保留“任何 decoded duplicate key 都失败”，且优先尺寸：** 先进行 `clarinet` + native grammar gate 的完整项目 spike。它有 23.5 KB 直接 CJS scanner、零传递依赖、不 materialize AST，但比 Momoa 多一次 parse、事件栈和私有 type bridge；首版应省略位置/pointer 等不由其稳定提供的事实。
3. **保留 duplicate、位置/AST 遍历和接入直观性优先：** 继续 Momoa。它约 92.5 KB 的单入口代码面仍是零传递依赖，复杂度更低，但不是体积最小。

因此，本轮将先前“Momoa 是最直接的 single-library 选择”细化为：**若 size 是第一优先级，Clarinet 组合值得先 spike；若只验证有效 JSON，则根本不应引入 parser dependency。** 在用户确认保留 duplicate 与否、以及对位置/Pointer 的需求前，不应安装任一候选或改写 Change。
