---
title: "Lizard 1.24.1 更新内容与升级价值调查"
id: "261008-assess-lizard-1-24-1-upgrade"
formedAt: "2026-10-08T04:05:12Z"
question: "相对当前 1.24.0 源码基线，Lizard 1.24.1 更新了什么，哪些变化对 Vibe Check 有实际价值，应如何选择跟进范围和验收条件？"
tags:
  - "function-metrics"
  - "lizard"
  - "source-alignment"
  - "upstream-maintenance"
relations:
  - type: "补充"
    target: "261008-verify-lizard-latest-typescript-defects"
    summary: "评估其他修复收益与升级成本，区分升级和本地修复"
---

## 形成时背景

用户希望评估将源码基线从 `1.24.0` 更新到 `1.24.1` 的价值。[前序核验](./verify-lizard-latest-typescript-defects.md)已确认新版仍保留显式返回类型边界污染和 `??` 双计；本轮进一步调查其他更新收益，区分升级与这两项修复。

## 调查目的

比较上游变化、对本项目的收益、实施面与验收风险，为下一轮跟进范围提供依据。

## 调查范围与依据

取证于 **2026-10-08 12:01（UTC+08:00）**。维护入口 `bun run maintenance:lizard-upstream` 返回 `update-available`；[取证时最新稳定版](https://github.com/terryyin/lizard/releases/tag/1.24.1)为 `1.24.1`，发布于北京时间 2026-10-06 06:49。

| 对象 | 身份与核对 |
| --- | --- |
| 仓库基线 | `1.24.0`、commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`；归档中 68 个唯一来源文件与账本 SHA-256 全部相等 |
| 新版源码 | tag `1.24.1` 指向 commit `0488a260e74e73ceba3149d7c600faac6a3616e6`；逐文件比较两个完整归档及相关源码差异 |
| 新版发布包 | [PyPI sdist](https://pypi.org/project/lizard/1.24.1/) 的 SHA-256 与 registry 相等；11 个新增或变化的 Python runtime 文件与新版 commit 归档相等 |
| 行为对照 | 14 项独立文本输入，分别交给 Python 两版本、新版 PyPI 包及形成时 TypeScript 移植 |

Python 宿主为 `3.12.13`、Pygments `2.20.0`，直接 import 下载源码；移植侧使用 Bun `1.4.2` 的私有 façade。两侧按 `complextags`、`nd` 顺序启用扩展，比较函数名、位置、非注释代码行 NLOC、圈复杂度 CCN、最大嵌套深度 ND、参数数及贡献列表。上游回归测试提供触发形态，独立样例仅作为分析文本。

资源按用途分工：`source-review.json` 保存来源、差异分类与模块映射；`survey-inputs.json` 保存输入及测试定位；`observations.json` 保存结果和相等检查；两个 driver 提供重跑入口。

## 调查结果与边界

**建议跟进 `1.24.1` 的既有 reader 修复，作为下一轮固定源码基线；Cognitive Complexity 单独评估。升级与本地缺陷修复分别验收。**

### 已确认的更新收益

形成时移植的 14 项结果全部与 Python `1.24.0` 相等，新版 commit 与 PyPI 也全部相等。13 项出现行为变化，除法控制项保持不变。

| 上游更新 | 对照结果与产品价值 |
| --- | --- |
| TS/TSX：regex 参数后的边界 | `regex-argument.ts` 的 `scan` 结束行从 6 恢复到 4，后两个函数保持独立 |
| TS/TSX：模板插值中的引号与反引号 | `template-backtick.ts` 从一项延伸至文件末尾的结果恢复为三个独立函数；本项证据针对边界 |
| 共享 regex tokenizer：引号、转义、字符类 | JS/JSX/TS/TSX/Ruby/Vue 六项输入均从合并后续函数恢复为两个函数；除法控制项不变 |
| Python：PEP 695 泛型函数 | 嵌套 bound 样例的函数名由 `]` 恢复为 `choose`，CCN、ND 和参数数保持；改善 Finding/waiver 的函数定位 |
| Kotlin：表达式体及 `when` | 原先遗漏的函数被识别，`when` 样例得到 CCN 2；精确位置仍须核对 |
| PHP：trait 方法 | 一项延伸至 trait 末尾的结果变为两个方法，分别在第 5、8 行结束；恢复方法粒度与 NLOC |
| Rust：`match` arms 与嵌套 match | 三个 arm 的样例 CCN 从 2 改为 3；门禁与 waiver 结算可能随新计量变化 |

新版另增 912 行的 Cognitive Complexity 扩展，提供 `cognitive_complexity`、`CogC` 列和默认阈值 15。它是独立的新指标能力，引入会扩展指标契约、配置、输出及 waiver，建议按[扩展采用边界](../decisions/keep-lizard-advisory-explicit-with-selected-extension-adoption.md)单独评估。

### 跟进范围与实施面

已移植逻辑的变化集中于 **七个模块**：共享 `js-style-regex`、TypeScript、TSX、Python、Kotlin、PHP states、Rust。统一基线可减少多项 reader 偏差的长期维护；先挑选局部补丁则需保留对应偏差证据。建议保持现有四项指标、reader 支持、私有 façade/Worker 和两个已启用扩展。

两版本同为 **27 readers / 55 个去重后缀**；共享状态机、reader registry、已启用的两个扩展、根 license 和 `setup.py` 字节不变，保留的分析核心定义也不变。其余 Python 改动为 CogC 的 CLI 接线、版本更新和 Halstead 缩进。完整归档的 445 项变化中有 419 项 agent 指导，产品实施面应以相关模块映射为准；完整分类及 GitHub compare API 的 300 项限制保存在资源中。

升级需同时维护来源与行为证据：provenance、来源 header/range/hash、identity、oracle/deviation、派生 package pin、固定版本 fixture 及 advisory 基线。责任和流程见[分析器 owner](../development/scanner-dependencies.md)与[来源映射维护](../tooling/source-mapping.md)。

### 采用前的验收重点

- **Rust 贡献解释。** 新版三个 arm 得到 CCN 3，但启用 `complextags` 后贡献列表为空；旧版 CCN 2 带 `match` 贡献。新版状态直接增加条件，贡献扩展仍按条件 token 采集，需核对[公开 CCN 解释](../checks/function-metrics.md#效果与结果)。
- **Kotlin 位置与 NLOC。** 一行表达式体结束行被报为下一声明所在的第 2 行；实际在第 4 行结束的 `when` 表达式被报为第 5 行，即下一函数的开始行。识别改善与精确位置验收应分别判断。
- **regex 翻译兼容。** 新实现从事后收集/拼接 token 改为提前识别并逐项 yield，需验证 Python/JS 正则语法、空白/换行与 extension 生命周期。
- **升级与本地修正。** 新固定上游的翻译一致性、获批修正及其不同期望分别记录在 oracle/deviation 中；前序两个缺陷继续保留独立修复证据。

建议验收覆盖本组 14 项、前序 11 项、27-reader oracle/identity、malformed 与 extension 生命周期，再验证公开 Worker/Finding、package artifact/installed consumer 和 `bun run check -- --all`。真实目标 corpus 的耗时与资源变化按[性能证据流程](../tooling/lizard-performance.md)测量。

### 证据边界与复现

本轮取得的是有限样例的收益和源码影响面，实际产物为报告与证据；产品、依赖、Decision 与 Change 保持原状。消费者语言分布、完整新版翻译 parity、模板整体计量、性能变化和修复后发布结果仍待验证，实施升级或向上游写入需后续授权。

从仓库根，对经 archive/hash 核对的源码分别运行，传入相应版本与精确 commit；下例为 `1.24.1`：

```sh
uv run --no-project --offline python \
  docs/investigations/_resources/261008-assess-lizard-1-24-1-upgrade/upstream-driver.py \
  /path/to/verified/lizard-source \
  docs/investigations/_resources/261008-assess-lizard-1-24-1-upgrade/survey-inputs.json \
  1.24.1 0488a260e74e73ceba3149d7c600faac6a3616e6

bun docs/investigations/_resources/261008-assess-lizard-1-24-1-upgrade/port-driver.mjs \
  . docs/investigations/_resources/261008-assess-lizard-1-24-1-upgrade/survey-inputs.json
```

源码身份以 archive/hash 为准，版本与 label 是运行 metadata；退出 0 表示观察完成，升级验收以输出的边界、指标和贡献为依据。

## 随附资源

- [两版本观察及移植、发布包相等检查](./_resources/261008-assess-lizard-1-24-1-upgrade/observations.json)
- [当前私有移植观察入口](./_resources/261008-assess-lizard-1-24-1-upgrade/port-driver.mjs)
- [完整差异分类、模块映射与源码身份](./_resources/261008-assess-lizard-1-24-1-upgrade/source-review.json)
- [独立输入与上游回归触发形态](./_resources/261008-assess-lizard-1-24-1-upgrade/survey-inputs.json)
- [原始上游观察入口](./_resources/261008-assess-lizard-1-24-1-upgrade/upstream-driver.py)
