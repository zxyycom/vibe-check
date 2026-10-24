---
title: "Bun 升级暴露的严格断言原型兼容问题"
id: "261024-diagnose-bun-strict-assertion-compatibility"
formedAt: "2026-10-24T14:05:42Z"
question: "Bun 1.4.4 下旧测试的 null-prototype 深比较失败来自产品变化还是断言语义，怎样保留原证明责任？"
tags:
  - "bun"
  - "runtime-compatibility"
  - "test-evidence"
relations: []
---

## 形成时背景

2026-10-24，仓库按用户授权将全局和项目 Bun 从既有版本升级到 1.4.4，并接入严格离线的真实包安装。
随后首次 `bun run check -- --all` 为 33 passed / 8 failed / 2 not-applicable；真实产物和 installed docs/runtime
通过，但六条测试 lane 出现 47 个失败节点。大部分差异仅为 `[Object: null prototype]` 对普通对象字面量。
另外两项失败是本轮新增代码的 lint 与 Case 账本行数，不属于本报告的断言根因。

本轮问题是升级后的测试兼容性，不是改动 Product 数据模型。历史
[tokenizer 验证](evaluate-bounded-tokenizer-optimization.md)与
[文件收集接入](project-file-collection-readiness.md)曾记录 Node 或 ambient Bun 的类似断言差异，
但未专门解释和修复其共同原因；本报告独立回答这一问题，不把那些性能或接入结论作为前序验收。

## 调查目的

区分 Product 输出发生变化、测试预期错误与运行时断言差异；确定怎样在新 Bun 上恢复原有 JSON 内容证明，
同时保留原型、冻结、精确字段、基本类型和引用身份的独立观察。不修改 Product、lint 规则、Gate 预算或超时，
不以旧 Bun 的通过结果作为规范，也不全局改用宽松相等。

## 调查范围与依据

调查基于 main `4cf52b42` 加当时未提交的第八/九版改动；实际运行环境为 Linux x64、Bun 1.3.14 / 1.4.2 / 1.4.4
与 Node 24.18.0。旧版本仅通过现存的 mise binary 执行有界 probe，没有回退项目 pin 或更换依赖。

- 读取首次 Gate 各失败 transcript，逐节点定位首个失败断言。现场为
  `.log/project-gate/2026-10-24T13-57-45.523Z-1603456-92addc46-aecc-4d32-8bfb-1d7303274660/`；
  candidate 为 `0.0.0-local.84bc50bf8be7`。此路径为可清理本地现场，本报告内的结果摘要不依赖其永久存在。
- 对同一最小对象比较执行四运行时对照；独立执行者再次核对默认原型差异，以及允许跳过原型后错误类型/额外字段仍失败。
- 直接比较旧/新 Bun 的 `canonicalizeJsonValue({ nested: { n: 1 } })`：两者都产生递归 null-prototype、冻结的对象。
  strict-document 的两节点窄对照中，旧 Bun 为 2 pass；新 Bun 与 Node 都在内容比较失败，而显式原型/冻结节点仍通过。
- 读取 [Canonical JSON 与闭合快照](../guides/data-boundaries.md)、对应 data-boundary 和 strict-document 测试，
  确认 canonical JSON 的 null prototype 与 closed-record snapshot 的普通 prototype 是不同契约。
- [Node 24.18 官方 Assert 文档](https://nodejs.org/download/release/v24.18.0/docs/api/assert.html#new-assertassertoptions)
  说明 strict 模式默认比较原型，`skipPrototype` 可只跳过原型/构造器比较；实例方法必须保留实例调用方式。

核心 probe 等价源码如下；`Assert` 不存在时仅记录不支持，不尝试兼容模拟：

```js
import assert from "node:assert/strict";

const actual = Object.assign(Object.create(null), { value: 1 });
assert.deepStrictEqual(actual, { value: 1 });

// 独立步骤：默认比较是否失败不能阻止这一候选验证。
const jsonAssert = new assert.Assert({ strict: true, skipPrototype: true });
jsonAssert.deepStrictEqual(actual, { value: 1 });
assert.throws(() => jsonAssert.deepStrictEqual(actual, { value: "1" }));
assert.throws(() => jsonAssert.deepStrictEqual(actual, { value: 1, extra: true }));
```

上面省略了各步骤的捕获/结果打印。另用反例核对嵌套类型、缺失 undefined 字段、array/object、负零、Infinity、
自有 constructor 字段和数组顺序，不把普通字符串化相等误当作同一比较能力。

## 调查结果与边界

### 已确认的差异与因果判断

| Runtime | 默认 deepStrictEqual：null-prototype 对普通对象 | 独立 Assert + skipPrototype |
| --- | --- | --- |
| Bun 1.3.14 | 通过，与严格原型契约不符 | Assert 构造器不可用 |
| Bun 1.4.2 | 拒绝 | 内容相同通过，错误类型/额外字段拒绝 |
| Bun 1.4.4 | 拒绝 | 内容相同通过，错误类型/额外字段拒绝 |
| Node 24.18.0 | 拒绝 | 内容相同通过，错误类型/额外字段拒绝 |

Product 输出在跨版本 probe 中未变；旧测试把 JSON 内容与普通对象原型绑定，依赖了旧 Bun 不完整的严格比较。
升级使该问题显露，不支持将产品改为普通对象的修复。未查询 Bun 上游提交以确定最早修复版本，1.4.2 只是本轮已证实的版本点。

首次 47 个失败节点分布为 Core/package-tools 33、function metrics 4、JSON 3、Markdown 1、supporting Checks 5、
package tooling 1。每节点日志只显示首次失败；修复后仍须执行完整正文，不能把这个数字当成全部受影响断言数。

`resolved-checks.handoff` 表面报 `undefined` 对 Map 的引用不相等；实际是 callback 内 `read.data` 的深比较先抛错，
Product 按既有规则隔离该异常，使后续 handoff 赋值未执行。这不是新的 handoff 生产缺陷；修复必须保留引用相等断言，
并把被 containment 的内容观察交给 callback 外断言，避免错误归因。

### 采用方向与不采用方案

用户已追加授权修复旧断言。采用 test-only `assertJsonValueEqual`，内部直接调用独立
`Assert({ strict: true, skipPrototype: true }).deepStrictEqual`；只在契约要求 JSON 内容相等的具体调用点使用。
其职责不含 JSON 准入、规范化、原型、冻结、descriptor 或引用身份检查，默认 strict assert 保持不变。
canonical-data、closed-values、strict-document 和 Check facts 中的显式安全断言继续独立保留；opaque handoff 与 finding
仍按原引用/结构契约比较。

不采用 legacy loose deepEqual、JSON stringify/parse roundtrip 或生产 canonicalizer 构造 expected：前者弱化基本类型，
字符串化会丢失 undefined、Infinity 和负零信号，生产规范化则形成同实现自证并可能改变被比较值。
不以“全部测试通过”为由删除原型验证，也不对整文件的默认 assert 实例设置 skipPrototype。

### 验证和适用边界

形成时已完成运行时对照、Product 输出核对、失败节点与 owner/Case 审计，并按上述边界修改测试。
最终目标组合在 Bun 1.4.4 为 89 pass / 37 files，product/scripts typecheck 与 lint、格式检查通过；Node 24.18 的
canonical-data、closed-values 和 strict-document 共 11 tests 通过。私有变异验证证明 Record 缺 id、data 错误类型及
handoff 内容错误仍使 runner 报 ERR_ASSERTION，临时副本已清理。报告形成时，完整修复后的 Gate 尚待运行；上述窄验证不提供完整 Gate 结论。
本轮没有改变数据边界公开契约，未证明整个 Bun assert 实现无其它兼容差异，
也不承诺未运行的所有源测试可在 Node 上直接执行。后续运行时变更、值比较 helper 扩大到非 JSON 对象，或独立原型证明被移除时，
须重新核对比较边界，不能复用本报告自动放宽断言。
