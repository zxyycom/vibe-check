---
title: "TypeScript 函数边界与空值合并指标缺陷独立核验"
id: "261008-verify-typescript-function-metrics-defects"
formedAt: "2026-10-08T03:13:21Z"
question: "外部报告描述的 0.0.3 显式返回类型边界污染和空值合并双计是否可独立复现，当前源码是否仍存在，以及根因与修复候选的证据边界是什么？"
tags:
  - "function-metrics"
  - "lizard"
  - "tokenizer"
  - "typescript"
relations: []
---

## 形成时背景

另一项目在 2026-10-06 报告 `@zxyycom/vibe-check@0.0.3` 的两项异常：显式返回类型使函数外控制流进入指标，空值合并 `??` 被计为两枚三元问号。用户要求独立核实，本轮以重构样例检查发布产物和形成时工作树。

## 调查目的

确认两项行为、公开 Finding 的影响及源码原因，检验回调修复候选的证据强度。本篇保存行为核验；Python 上游归属见[后续来源核验](./trace-typescript-metrics-upstream-origin.md)。

## 调查范围与依据

取证于 2026-10-08，工作树 HEAD 为 `d266937d0c3e76dfeeee87f7b0901316e162dea3`。

| 对象 | 取证方式 | 实际宿主 |
| --- | --- | --- |
| `0.0.3` 发布产物 | [registry 元数据](https://registry.npmjs.org/@zxyycom/vibe-check/0.0.3)与[发布包](https://registry.npmjs.org/@zxyycom/vibe-check/-/vibe-check-0.0.3.tgz)；直接使用包根 `index.mjs` 导出的 ESM 产物 | Node `v24.18.0` |
| 形成时工作树 | 读取当次源码；相关文件 hash 标识实际字节 | Bun `1.4.2` |
| 11 项独立样例 | 四项函数边界对照、七项操作符对照；函数仅作为分析文本 | 两侧分别运行 |

发布包 SHA-512 与 registry integrity 一致；五项相关发布源码与工作树相同，另记录对应编译模块 hash。发布包复用工作区 `node_modules`，元数据未提供 `gitHead`；身份清单保存在资源中。

公开 `functionMetrics` 经 `defineConfig`/`run` 执行两个 blocking profile：诊断 profile 将 CCN、ND 上限设为 1；默认 profile 使用 CCN 12、ND 7，其余上限均保留默认值。私有 `analyzeLizardSource`、tokenizer 和回调探针用于原因诊断。CCN 为圈复杂度，ND 为包采用的 Lizard 最大嵌套深度，NLOC 为有效代码行数；指标契约见[指标指南](../checks/function-metrics.md)。

`observations.json` 合并保存两侧相同的基线、全部 Finding data 和候选差异；`reproduce.mjs` 保存完整输入与操作；`source-identity.json` 保存来源和校验范围。

## 调查结果与边界

**两个缺陷在 `0.0.3` 发布产物与形成时工作树中均复现。默认阈值下，四个 `??` 的错误 ND 导致一个 blocking Finding。**

### 函数边界污染

四项样例的函数正文均在第 3 行闭合；`typed` 显式声明 `: string`，`inferred` 省略返回类型。带 `tail` 的文件在第 4—10 行追加相同的顶层 `if → for...of → if`。

| 样例 | 分析结束行 | NLOC | CCN | ND |
| --- | ---: | ---: | ---: | ---: |
| `typed-only.ts` | 3 | 3 | 1 | 0 |
| `inferred-only.ts` | 3 | 3 | 1 | 0 |
| `typed-tail.ts` | 10 | 10 | 4 | 3 |
| `inferred-tail.ts` | 3 | 3 | 1 | 0 |

诊断 profile 为 `typed-tail.ts` 的 `marker` 产生 CCN 4、ND 3 两个 Finding，CCN 贡献全部来自函数外第 4、5、6 行的 `if/for/if`；另三个对照无 Finding。该样例的错误指标仍低于默认阈值。

### 空值合并误计

操作符样例均省略返回类型，表达式同处一个 `return [...]`，与函数边界缺陷隔离。两侧结果如下：

| 样例 | 问号相关 token | CCN | ND |
| --- | --- | ---: | ---: |
| `baseline-four.ts` | 无 | 1 | 0 |
| `coalesce-one.ts` | `?`、`?` | 3 | 2 |
| `coalesce-four.ts` | 八枚 `?` | 9 | 8 |
| `coalesce-compact.ts` | `a?`、`?` | 2 | 1 |
| `optional-parameter.ts` | `a?` | 1 | 0 |
| `ternary-one.ts` | 一枚 `?` | 2 | 1 |
| `ternary-four.ts` | 四枚 `?` | 5 | 4 |

两侧诊断 profile 各有 10 个 blocking Findings；默认 profile 各只有 `coalesce-four.ts` 的 ND **8 > 7** 一项，Check 与 aggregate 均为 `failed`。CCN 9 低于默认上限 12。诊断 Finding 包含刻意降低阈值后触发的真实三元对照。

并列四个真实三元表达式得到 ND 4。探索尾随块时，经典 `for (let i = 0; i < 1; i++)` 得到 ND 2，改为 `for...of` 后得到 ND 3；两者均误分析到第 10 行，CCN 4。变体保存在资源中；完整 ND 定义及其与 AST 口径的关系仍待另行审查。

### 因果解释与候选

以下位置以 `src/package-checks/function-metrics/analyzer/` 为共同前缀，对应形成时源码。

**函数边界。** 类型注解完成路径（`readers/typescript.ts:531–535`）重放函数体 `{`，重入安装调用 `endOfFunction()` 的函数体完成回调；父状态机（`shared/code-reader.ts:216–224`）随后清空唯一槽。探针观察到“旧回调执行 → 新槽为 function → 外层返回后为 undefined”。

候选临时改为“取出旧槽 → 清空 → 调用旧回调”，以 `callback?.call(this)` 保留接收者。`typed-tail.ts` 的结束行/NLOC/CCN/ND 恢复为 **3/3/1/0**，另 10 项不变；正常内部嵌套控制项为 CCN 4、ND 3、结束行 8，贡献仅来自正文。这支持本组输入的因果解释；候选仅经私有直接分析检验，公开 Worker、跨 reader 与发布验收仍待完成。

**空值合并。** `shared/code-reader.ts:513–540` 的组合符号缺少 `??`；`readers/typescript.ts:80` 优先匹配 `\w+\?`。独立 `?` 进入 TypeScript reader 的条件集合，经 `pipeline.ts:118–121` 和 `extensions/lizardnd.ts:20–32,90–95` 分别增加 CCN、ND。token、贡献列表和指标差值共同支持这条解释。

候选应将带空格和紧凑写法的 `??` 都识别为单个 token，同时保持 `a?: number` 正确；这需要处理 `a?` 的优先匹配，再明确 `??` 的 CCN/ND 策略。若每个 `??` 计一个 CCN 决策，四项应为 5；这是条件验收值。修复须按[分析器 owner](../development/scanner-dependencies.md)验证共享 reader 兼容并维护来源或偏差证据。

### 证据范围与复现

- **覆盖范围：** `0.0.3`、上述 Node/Bun 宿主及 11 项 TypeScript 形态；发布包与工作树的行为、token 和公开 Findings 相同。
- **取证边界：** 原项目附件、锁文件、安装图和修改前真实函数未提供，因此本轮是独立复现。其他版本、返回类型、箭头函数、TSX 和语言，以及 Python 上游来源不在本轮取证范围。
- **实际动作：** 保存报告、资源和索引；分析器与依赖保持原状。

从仓库根重跑；发布包模式需准备经 integrity 核对的解压根：

```sh
bun docs/investigations/_resources/261008-verify-typescript-function-metrics-defects/reproduce.mjs . --source
/path/to/node-v24.18.0 docs/investigations/_resources/261008-verify-typescript-function-metrics-defects/reproduce.mjs /path/to/extracted/package
```

runner 清理自有 fixture，退出 0 表示诊断完成。修复判断须核对输出中的版本、宿主、token、指标与 Findings；私有导入失败表示入口需要适配。

## 随附资源

- [规范化观察与比较结果](./_resources/261008-verify-typescript-function-metrics-defects/observations.json)
- [独立复现及回调因果实验](./_resources/261008-verify-typescript-function-metrics-defects/reproduce.mjs)
- [发布包与当前相关源码身份](./_resources/261008-verify-typescript-function-metrics-defects/source-identity.json)
