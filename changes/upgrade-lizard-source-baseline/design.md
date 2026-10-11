# Design

本设计以固定新版忠实翻译和两项有界偏差兑现升级 Outcome；实施及验收按 [Tasks](tasks.md)推进。

## Context

- 实施前生产来源为 `1.24.0` / `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`；[升级调查](../../docs/investigations/assess-lizard-1-24-1-upgrade.md)保存新版身份、七模块映射和 14 项收益/风险。实施进度及已取得证据由 [Tasks](tasks.md)记录，不从本节背景推断当前状态。
- [准备度核对](../../docs/investigations/prepare-function-metrics-change-plans.md)以形成时 owner、源码和本地精确 Git object 核对最小路线，资源保存七模块差异及 Rust/Kotlin/regex 原文/hash；移植与产品验收由 [Tasks](tasks.md)承接。
- [分析器 owner](../../docs/development/scanner-dependencies.md)优先 source fidelity；公开 CCN Record 要有完整有序贡献，位置用于 Finding/waiver。[扩展采用边界](../../docs/decisions/keep-lizard-advisory-explicit-with-selected-extension-adoption.md)保持 advisory 显式、新指标独立评估。

## Goals / Non-Goals

- **目标**：取得既有 reader 改善，闭合固定来源、完整贡献/精确位置、公开结果、包及升级成本。
- **保持**：四指标/default limits、27 readers/55 suffixes、selected pair、私有分析链、exact inputs、资源/取消及离线 Product。
- **不承担**：TypeScript 返回类型/`??` 修复、新扩展、通用 parser/贡献事件框架、运行时 Python/CLI、上游 issue/PR、发布或删除 Change。

## Decisions

### Intended Change

**采用固定 `1.24.1`。** 先冻结实施基线和原始新版结果，再翻译，最后叠加满足既有公开承诺的偏差。默认先升级再修复；升级不是修复技术前提，调序时更新两者偏差基线并重验。

#### 七模块翻译入口

| 上游 source（均在 lizard_languages） | 仓库 target / 动作 |
| --- | --- |
| `js_style_regex_expression.py` | `analyzer/shared/js-style-regex.ts`：addition 提前匹配、逐项 yield；Python `\A` 映射 JS source-start anchor，按 Python whitespace helper 拆前缀空白/换行；不再收集整个 token stream。 |
| `typescript.py`、`tsx.py` | `analyzer/readers/typescript.ts`、`tsx.ts`：共用新版 TEMPLATE_LITERAL，按原优先级翻译。 |
| `python.py` | `analyzer/readers/python.ts`：PEP 695 嵌套泛型 bound 的函数名/签名。 |
| `kotlin.py` | `analyzer/readers/kotlin.ts`：expression body/when 状态与返回生命周期；叠加下述位置偏差。 |
| `php_states.py` | `analyzer/readers/php-states.ts`：trait method 在自身关闭括号完成。 |
| `rust.py` | `analyzer/readers/rust.ts`：match subject nesting、独立 arm scope、每 scope 首 arm 不增量；叠加下述贡献偏差。 |

regex 分别验证 raw tokens/newline 与最终函数/metrics：引号、escape、character class、division/comments、文件首/标点后 literal、CRLF/Python 空白、TS/TSX template 内引号/backtick；覆盖 JS/JSX/TS/TSX/Ruby/Vue 六消费者。tokenFactory 和扩展顺序保持，不用 JS trimStart 或一条匹配成功代替 parity。

#### Rust：在真实增量处采集贡献

固定新版 `_state_global` 在 match scope 的第二及后续 `=>` 才 `add_condition()`；首 arm 不增加，非 match `=>` 不计。保留该 CCN，直接在成功增量处、complextags 已激活时，把真实 `=>`/当前 source line 追加到当前函数已有 tags；普通条件继续由原扩展采集。不得把全部 `=>` 加进静态 conditions、重复调用 conditionCounter、添加虚构 match token 或改 ND。

验收 zero/one/multiple arms、nested match、括号内 subject、非 match arrow、guard 与混合普通条件；每 scope 首 arm 状态独立，contributors 与实际增量逐项对应且 source order 不变。selected pair、complextags-only、无扩展分别证明生命周期。三 arm 样例 CCN 3，贡献恰为第 4、5 行 `=>`。

#### Kotlin：局部正文位置快照

新版在下一 declaration 到来时结束 expression body；lineCounter 已先给旧函数加该 token 的行/NLOC。Kotlin-local 保存最后正文有效 token 的 FunctionInfo 行/NLOC（when 子状态返回也更新），在 declaration ender、外层 `}` 或 EOF 完成该函数前恢复其测量边界，再重放下一 token。不得全局减一、回退 context.currentLine/file NLOC，或让 adapter 修正所有函数。

验收一行/多行 expression、when、getter/setter、comments/空行、`Foo::class`、最后函数 EOF、外层关闭与下一 declaration；分别断言函数名、位置/NLOC/CCN/parameters/ND 和下一函数。升级样例 expression 结束行/NLOC 1/1、choose 4/4；原始上游 2/2、5/5 观察独立保存。

### Resulting Impacts

1. **来源/版本闭合。** provenance 与 fixture 根迁为 `lizard-1.24.1`，人工维护 source/range/hash/SPDX 和 identity selection，再经 `mise exec -- bun run source-mapping -- sync` 派生 package pin。同步 NOTICE、package contract/legal audit、source identity/readers/adapter/encoding tests、benchmark workload/fixed-source identity、Gate test regions 与 advisory fixtures 的实际旧基线引用；历史调查不机械替换。定位扫描后逐个按 owner 判断。
2. **oracle/deviation。** 新版原始 oracle 与 Rust/Kotlin 修正期望分开；raw parity 限定未偏差字段/样例，Product assertions 消费修正期望，不能让 parity 覆盖错误位置或空贡献。源映射审计不证明行为。
3. **公开结果/兼容。** analyzer→adapter→真实 Worker→Check 证明全部字段、完整贡献、strict limits、blocking/waiver；位置/函数名变化可能使旧 waiver unused，须 changelog 说明，阈值/配置不变。稳定 owner 在实现验证后同步。
4. **包/成本。** 按 package lifecycle 生成 exact candidate，经 installed Node consumer 验证 Worker/法律材料。冻结升级前后同一真实 `src/**/*.ts` 清单/content digest、runtime、配置及 warm/cold 条件；记录完整 Check wall median/p95、样本、已解释行为变化 allowlist。既有性能 B 固定 `308b1c3…`；新版 Python parity 必须适配身份/workload/canonical 字段，并使用新版固定对象生成。不新增 backend 或硬毫秒预算。

## Risks / Trade-offs

- 两项必要偏差的具体补丁仍需直接 tests；失败不能靠删原始 oracle 或放宽阈值掩盖。
- regex 的 streaming/token/空白/扩展顺序变化，有限 14 样例不能代替六消费者及 27-reader/lifecycle 验收。
- 版本化材料/Case/Gate 共享 owner，升级与修复串行实施、独立提交/回退，admission 按实际重叠协调。
- 成本是 observation；可重复退化先定位本次翻译/偏差，不以噪声或旧 Python baseline 推导收益。需要扩大行为、新依赖或联网时停止该扩大动作并取得授权。

## Open Questions

无。翻译、补丁及验收按 [Tasks](tasks.md)推进；联网、新依赖安装和上游写入仍须当前任务授权。
