---
title: "Lizard 最新发布版与分支的 TypeScript 指标缺陷复查"
id: "261008-verify-lizard-latest-typescript-defects"
formedAt: "2026-10-08T03:53:23Z"
question: "锁定 1.24.0 的两项 TypeScript 指标缺陷是否已在上游最新发布版或 master 修复，升级能否替代本项目修复？"
tags:
  - "function-metrics"
  - "lizard"
  - "typescript"
  - "upstream-maintenance"
relations:
  - type: "补充"
    target: "261008-trace-typescript-metrics-upstream-origin"
    summary: "核验1.24.1与master，确认升级不能消除两项缺陷"
---

## 形成时背景

[前序来源核验](./trace-typescript-metrics-upstream-origin.md)确认两项 TypeScript 指标缺陷由锁定的 Python Lizard `1.24.0` 继承，但没有检查其他版本。用户进一步询问上游是否已经修复，以及本项目是否仍需自行处理。

## 调查目的

核实形成时最新稳定发布版与 `master` 对同组输入的行为，判断升级能否替代修复，并给出与当前私有移植边界相符的维护建议。

## 调查范围与依据

取证于 2026-10-08 03:52 UTC。公开入口 `bun run maintenance:lizard-upstream` 返回 `update-available`：仓库 baseline 为 `1.24.0`，上游最新稳定版为 `1.24.1`；[GitHub release](https://github.com/terryyin/lizard/releases/tag/1.24.1)与 [PyPI](https://pypi.org/project/lizard/1.24.1/)一致。

| 对象 | 固定身份与取证方式 |
| --- | --- |
| 最新发布包 | PyPI `lizard-1.24.1.tar.gz`，SHA-256 与当次 registry 元数据相等；解压后直接 import |
| 当次 `master` | GitHub API 解析为 `d5228c1268ca6fa0fcd1b63283d981fedcf1fbc9`，下载该精确 commit 的 archive 后直接 import |
| 本项目移植 | Bun `1.4.2` 重跑既有公开/私有 runner；五项相关源码 hash 与前序一致 |

Python 两侧均使用既有 Python `3.12.13`、Pygments `2.20.0`，按 `complextags`、`nd` 顺序启用扩展；没有安装依赖或修改下载源码。沿用前序 11 项原生文本输入，比较函数位置、NLOC、CCN、参数数、ND、条件贡献及问号 token，另运行回调槽探针；driver 校验模块实际路径和版本。函数文本只交给分析器，不执行。

资源保存当次元数据、归档 SHA-256、五项关键文件 hash、逐项观察和重跑入口；输入共享前序资源。发布包与 `master` 的五项文件彼此相同，其中共享 reader、CCN 贡献和 ND 扩展也与锁定 `1.24.0` 相同；这不是全包逐字比较。

## 调查结果与边界

**上游已有新版本，但这两项缺陷在最新发布版和当次 `master` 均未修复。单纯升级至 `1.24.1` 不能消除本轮复现的错误。**

### 最新版本的实际行为

两侧 11 项函数信息和问号 token 均与前序相等，本项目当次重跑也相等。关键异常如下，CCN 为圈复杂度，ND 为采用的 Lizard 最大嵌套深度：

| 样例 | 最新发布包与 `master` 的相同观察 |
| --- | --- |
| `typed-tail.ts` | 实际第 3 行闭合，结束行/NLOC/CCN/ND 仍为 **10/10/4/3**；贡献来自函数外第 4、5、6 行 |
| `coalesce-four.ts` | 四个带空格的 `??` 仍为八枚 `?`，**CCN 9、ND 8** |
| `coalesce-compact.ts` | 一个 `a??0` 仍为 `a?`、`?`，CCN 2、ND 1；带空格单项仍为 CCN 3、ND 2 |

两侧回调探针都显示“旧回调运行 → 新回调已安装 → 外层返回后不再 callable”。[共享状态机](https://github.com/terryyin/lizard/blob/d5228c1268ca6fa0fcd1b63283d981fedcf1fbc9/lizard_languages/code_reader.py)仍在调用旧回调后清空槽，组合符号仍缺少 `??`；[TypeScript reader](https://github.com/terryyin/lizard/blob/d5228c1268ca6fa0fcd1b63283d981fedcf1fbc9/lizard_languages/typescript.py)仍重放类型结束 token，并优先匹配 `\w+\?`。

`1.24.1` 发布说明中的 TypeScript 边界修复针对 regex 参数和模板插值等输入，不能据此认为显式返回类型问题已修复；本轮实际复现与该区别一致。本项目公开默认 profile 仍产生 `coalesce-four.ts` 的一项 blocking Finding：**ND 8 > 7**，aggregate 为 `failed`。

### 维护判断

本项目采用的是[产品自有 TypeScript 移植](../development/scanner-dependencies.md)，并非运行时调用 Python Lizard 的普通版本依赖。改锁文件、安装最新版 Python 包或 advisory 提示都不会更新随包分析器。

**建议在本项目私有分析器 owner 做最小受控修复，而不把整库升级当作这两项问题的解决方案。** 修复目标是可信的函数边界和操作符分类，不要求消费者删掉返回类型、改写 `??` 或放宽阈值。实施前需明确批准相对锁定上游的行为偏差，并维护来源、deviation 与行为证据：

- 回调修复保留重入安装的新槽，验收正常内部嵌套及共享状态机的其他 reader。
- tokenizer 同时正确识别带空格和紧凑 `??`，保留可选参数与真实三元行为，再明确 `??` 的 CCN/ND 策略。
- 重跑本组样例、公开 Worker/Finding 与发布包验收；原始上游 oracle 与修正后期望应分别保留，不把忠实复现错误当作正确性标准。

上游反馈可以与本地修复并行，未来合入后再以等价验证收敛偏差；提交 issue/PR、修改产品或升级基线仍需相应授权。本轮只保存调查证据。

### 适用范围与复现

“未修复”限定于当次 PyPI 最新版、上述精确 `master` commit 与本组 11 项输入，不覆盖其他返回类型、语言、未合并 PR 或之后的上游状态。新的 release/commit 需要重新运行；本轮没有验证候选补丁的完整正确性，也没有运行全量 Gate。

准备经 identity 核对的源码根，从仓库根重跑任一目标：

```sh
uv run --no-project --offline python \
  docs/investigations/_resources/261008-verify-lizard-latest-typescript-defects/latest-driver.py \
  /path/to/verified/lizard-source \
  docs/investigations/_resources/261008-trace-typescript-metrics-upstream-origin/input-and-port-observations.json \
  1.24.1 pypi-1.24.1
```

分支模式将末尾 label 换为精确 commit。相等字段比较保存的前序结果，仅表示缺陷仍相同；退出 0 表示观察完成，未来修复判断须检查 token、边界和指标，而非只看版本或退出码。

## 随附资源

- [共享的完整输入与前序移植观察](./_resources/261008-trace-typescript-metrics-upstream-origin/input-and-port-observations.json)
- [最新上游重跑入口](./_resources/261008-verify-lizard-latest-typescript-defects/latest-driver.py)
- [最新发布包、分支与本项目观察](./_resources/261008-verify-lizard-latest-typescript-defects/observations.json)
- [当次发布元数据与源码身份](./_resources/261008-verify-lizard-latest-typescript-defects/source-identity.json)
