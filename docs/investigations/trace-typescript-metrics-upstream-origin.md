---
title: "TypeScript 指标缺陷的 Lizard 上游来源核验"
id: "261008-trace-typescript-metrics-upstream-origin"
formedAt: "2026-10-08T03:24:47Z"
question: "已确认的函数结束边界污染与空值合并双计是 Lizard 1.24.0 上游已有行为，还是 Vibe Check TypeScript 移植或 Product 接线新增？"
tags:
  - "function-metrics"
  - "lizard"
  - "source-alignment"
  - "typescript"
relations:
  - type: "补充"
    target: "261008-verify-typescript-function-metrics-defects"
    summary: "同样11项在锁定Python上游复现，确认缺陷来源"
---

## 形成时背景

[前序行为核验](./verify-typescript-function-metrics-defects.md)在 `0.0.3` 与形成时 TypeScript 移植中复现了函数边界污染和 `??` 误计。本轮应用户追问，用原始 Python Lizard 补充核验这两个缺陷的来源。

## 调查目的

判断缺陷是项目锁定的 Lizard `1.24.0` 已有行为，还是 TypeScript 移植或 Product 接线新增，并区分源码起因与 Vibe Check 的结果维护责任。

## 调查范围与依据

取证于 2026-10-08，采用根 `licenses/lizard-1.24.0-provenance.json` 声明的 `terryyin/lizard` baseline：tag `1.24.0`、revision `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`。

Python 上游从锁定 revision 的 archive 解压后直接 import，宿主为 Python `3.12.13`、既有 Pygments `2.20.0`；driver 校验实际模块路径与版本。TypeScript 侧在 Bun `1.4.2` 重跑前序 runner，五项相关源码 hash 与前序一致。

上游身份核对覆盖五个关键文件：主分析器、共享 reader、TypeScript reader、CCN 贡献及 ND 扩展；SHA-256 均与既有 provenance ledger 相等，路径和下载来源保存在 `source-identity.json`。两侧采用相同顺序的 `complextags`、`nd` 扩展。

比较字段为函数名、位置、NLOC、CCN、参数数、ND、条件贡献及问号 token，输入序列化 digest 在两侧一致；样例包含函数边界、空值合并、可选参数和真实三元对照。另用原始 `CodeStateMachine` 检查回调槽。输入函数均作为分析文本。保存后的 driver 已重跑，输出与取证时逐字相等。

输入文件保存样例及形成时移植结果，Python 观察保存逐项比较和回调探针，identity 文件保存来源、校验值及样例 digest；driver 提供同输入的原始上游重跑入口。

## 调查结果与边界

**两个缺陷均已存在于锁定的 Python Lizard `1.24.0`，由 TypeScript 移植继承。11 项样例的函数信息及问号 token 与形成时移植结果全部相等。**

### 上游复现与原因

| 问题 | Python 上游观察 | 与 TypeScript 移植比较 |
| --- | --- | --- |
| 显式返回类型的函数边界 | 实际第 3 行闭合，分析到第 10 行；NLOC 10、CCN 4、ND 3，贡献来自尾随第 4、5、6 行 | 相同 |
| 四个带空格的 `??` | 八枚 `?`，CCN 9、ND 8 | 相同 |
| 一个带空格与紧凑 `??` | 带空格得到 CCN 3、ND 2；`a??0` 得到 `a?`、`?`，CCN 2、ND 1 | 相同 |

正常边界、无条件输入、可选参数与真实三元对照也全部相等，完整逐项结果保存在资源中。

**函数边界原因：** 上游[TypeScript reader](https://github.com/terryyin/lizard/blob/308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec/lizard_languages/typescript.py)在类型注解完成时重放函数体 token，并重入安装函数体结束回调；[共享状态机](https://github.com/terryyin/lizard/blob/308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec/lizard_languages/code_reader.py)随后清空唯一回调槽。Python 探针同样显示新回调从已安装变为不再 callable，移植保留了这个顺序。

**空值合并原因：** 上游共享 tokenizer 缺少 `??` 组合符号，TypeScript addition 优先匹配 `\w+\?`；CCN processor 与[ND 扩展](https://github.com/terryyin/lizard/blob/308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec/lizard_ext/lizardnd.py)消费独立问号后增加指标。错误测量值在原始 Python 中已经形成，源头位于上游分析器。

### 结果责任与维护建议

Vibe Check 将这些错误测量值用于公开 `functionMetrics`；前序验证的 `ND 8 > 7` blocking Finding 是 policy 对该值的应用。**缺陷源于 Lizard，已发布结果的维护责任属于 Vibe Check。**

建议在本项目分析器 owner 修复，采用上游补丁或记录受控的本地来源偏差，并完成共享 reader 与公开 Worker 验收。具体补丁和 `??` 计量策略仍待后续任务确定。

### 适用范围与复现

来源判断覆盖锁定 revision 与本组 11 项输入；其他上游版本、最新分支及移植的其他形态需要另行核验。本轮保存报告和证据，产品源码与依赖保持原状；候选修复的验收状态由前序报告说明。

从仓库根使用经上述身份核对的原始源码重跑：

```sh
uv run --no-project --offline python \
  docs/investigations/_resources/261008-trace-typescript-metrics-upstream-origin/upstream-driver.py \
  /path/to/lizard-308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec \
  docs/investigations/_resources/261008-trace-typescript-metrics-upstream-origin/input-and-port-observations.json
```

相等断言比较保留的形成时 TypeScript 结果；未来移植发生变更时，需更新当次输入与观察后重新取证。

## 随附资源

- [同输入与当前 port 观察](./_resources/261008-trace-typescript-metrics-upstream-origin/input-and-port-observations.json)
- [锁定上游与 port 的来源身份](./_resources/261008-trace-typescript-metrics-upstream-origin/source-identity.json)
- [原始 Python 上游比较入口](./_resources/261008-trace-typescript-metrics-upstream-origin/upstream-driver.py)
- [Python 上游观察与相等检查](./_resources/261008-trace-typescript-metrics-upstream-origin/upstream-observations.json)
