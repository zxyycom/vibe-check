---
title: "DeepReadonly Check options 类型退化调查"
id: "260910-diagnose-deep-readonly-option-type-erasure"
formedAt: "2026-09-10T08:41:30Z"
question: "Vibe 的 DeepReadonly 除了把非空 command tuple 降级为普通数组外，还会破坏哪些受支持的 Check options 类型契约，应如何划分后续修复与验证范围？"
tags:
  - "public-api"
  - "type-safety"
  - "typescript"
relations: []
---

## 形成时背景

外部使用者报告：自定义 Check 把 command 表达为 `readonly [executable: string, ...arguments: string[]]` 时，execution 中的 `options.command` 变成 `readonly string[]`；在启用 `noUncheckedIndexedAccess` 的 TypeScript consumer 中，解构出的 executable 因而是 `string | undefined`。使用者以 `{ executable, commandArguments }` 两个字段绕过了错误，并判断运行时并未真正丢失命令。

形成报告时，仓库已有 active/unaligned Decision `260909-provide-public-command-check` 和 Draft Change `add-public-command-check`。该 Draft 已选择独立 executable 与 dense arguments，但公共 `DeepReadonly` 同时服务所有自定义 Check 的 preflight/execution options，因此需要先判断这是 commandCheck 的局部建模问题，还是共享类型契约缺陷。本轮只调查并沉淀证据，不修改产品实现。

## 调查目的

1. 在当前源码和 exact installed candidate 中复现 tuple 退化，区分声明层、运行时 snapshot 和 machine output。
2. 检查同一递归 utility 是否还破坏其它受支持的 options 类型信息或产生不安全的类型结论。
3. 找出当前验证为何未发现问题，并界定最小、可信的后续修复与验收范围。
4. 划分共享类型修复、commandCheck Draft 和仓库严格度审计的后续责任。

## 调查范围与依据

调查基线是 Git HEAD `18646a96caa4e93d68c9879fa4107ab751984e20`、exact local candidate `0.0.0-local.7bad8ccfc61f`、TypeScript `6.0.3` 与 `@typescript/native-preview` tsgo `7.0.0-dev.20260621.1`。实际检查了：

- `src/check/check.ts` 中 `DeepReadonly` 的定义，以及它在 `CheckExecutionContext.options` 和 `CheckPreflight` 输入中的公共传递路径。
- `src/check/options-snapshot.ts`、Definition options 解析和 preflight prepared/fallback snapshot，确认运行时 canonicalization 与冻结行为。
- exact candidate 的 emitted `types/check/check.d.ts`，并在仓库祖先路径之外安装该 tarball，以 `strict + noUncheckedIndexedAccess` 编译真实 package-root consumer。
- 非空 variadic tuple、异构定长 tuple、可选 tuple、判别 tuple union、普通 mutable/readonly array、嵌套 array item 和 `unknown` leaf 的类型探针；候选类型表达分别用 TypeScript 与 tsgo 编译。
- 当前 product/scripts tsconfig 和 external-consumer type acceptance 的 compiler options，并临时对完整 product/scripts scope 启用 `noUncheckedIndexedAccess` 统计诊断规模。
- `src/machine-output/v4/schema.ts` 的同名 private helper、当前 TypeBox schema 形状、v4 machine publication fields，以及 public commandCheck Decision/Draft 的责任边界。

详细探针和观察摘要保存在随附资源。本轮未查版本历史，也未分类或修复全仓 `noUncheckedIndexedAccess` 诊断；commandCheck、稳定 owner、测试和产品代码均保持不变。

## 调查结果与边界

### 已确认事实

1. **tuple 退化是共享公共类型缺陷。** `DeepReadonly<T>` 的数组分支先以 `infer Item` 合并全部元素类型，再重建 `readonly DeepReadonly<Item>[]`。该转换必然丢失 tuple 的必填位置、literal length、位置类型、可选位置、rest 前缀和 labels；对判别 tuple union 还会丢失 discriminant 与 payload 的相关性。它同时影响 preflight 的 authored options 与 execution 的 prepared options，不限于 command。
2. **exact installed package 可复现原报告。** 隔离 consumer 使用非空 command tuple 时，tsgo 明确报告第 0 项为 `string | undefined`。即使不启用 `noUncheckedIndexedAccess`，退化后的 `readonly string[]` 也不能重新赋给原非空 tuple，说明问题不是单一 compiler flag 制造的。
3. **还存在独立的 `unknown -> never` 不安全映射。** 当前 primitive/object/array 分支均不匹配 `unknown`，最终分支返回 `never`。`{ payload: unknown }` 是现有 `Options extends object` 接受的 shape，且 payload 可以在运行时是合法 canonical JSON。隔离 consumer 因 `never` 可赋给任意类型，能无 cast 地把数值 payload 赋给 `string` 并通过类型检查；实际执行随后抛错并结算为 `unavailable / execution-threw`。因此这不是单纯的开发体验问题，而是类型系统放行了错误假设。
4. **运行时没有丢失 tuple 数据。** public Run 的 execution 收到 detached、deep-frozen array，长度、顺序和元素值与 authored tuple 一致。runtime JavaScript 本身没有 tuple 身份；非空和位置语义来自 TypeScript authoring contract，untyped/hostile 输入仍由 Definition 的 canonical JSON validation 与 Check-owned domain validation 负责。
5. **Vibe 当前 machine output 不受这次 command tuple 直接影响。** authored/prepared options、executable 和 arguments 不在 v4 machine run/record schema 中。machine-output 内部另有一个同样 flatten array 的 private `DeepReadonly`，但当前 schema 只使用 homogeneous `Type.Array`，没有发现 `Type.Tuple`，所以本轮未确认现有 v4 DTO 的可观察错误。它是后续实现时需明确审计的相似风险，不是本报告已证实的 machine-output Bug。
6. **现有验证存在针对公共 consumer compiler mode 的盲区。** product、scripts 和 external-consumer tsconfig 都启用 `strict`，但没有启用 `noUncheckedIndexedAccess`。把该选项直接加入整个仓库会产生 product 73 条/29 文件、scripts 125 条/40 文件的诊断，范围远超本缺陷；这些诊断未逐项判断，不能据此声称还有 198 个 Bug，也不应把全仓迁移塞进本次修复。

### 后续处置与责任边界

- `DeepReadonly` 可作为局部公共类型修复直接实施，无需为该简单修复建立独立 Change。目标是让受支持的 Check options 在深只读投影后保留静态结构与不确定性，使严格索引 consumer 能安全使用非空/判别 tuple 和 `unknown` leaf。
- 可行实现是以 homomorphic mapping 保留 array/tuple 形状，并让非 object leaf 保持自身类型；canonical JSON 有效性继续由运行时边界负责。随附候选已在两套当前 compiler 上保留 tuple、普通 array 和 nested readonly 行为，但尚未进入产品。
- 这是 public TypeScript source compatibility 调整：tuple 使用者将得到更窄且正确的类型；依赖错误 `never` 映射把 `unknown` 静默赋给具体类型的 consumer 将出现编译错误。实施时需明确最低支持 compiler，并检查 emitted declaration。
- 验收需要两层直接证据：product typecheck 中的 source-level type assertions，以及隔离 installed consumer 的专用 `strict + noUncheckedIndexedAccess` fixture。全仓严格度策略由 Draft Change `audit-typescript-typecheck-strictness` 独立审计，不是该局部修复的完成条件。
- `add-public-command-check` 可继续基于领域清晰度选择 `{ executable, commandArguments }`；共享 utility 不再作为拆字段的理由。该 Draft 继续拥有 process lifecycle、敏感输出和 machine facts 的开放问题。
- 实施时审计 machine-output private helper，并记录同步修正或维持现状的依据。当前没有 `Type.Tuple` consumer，因此 machine schema 变化不能作为本缺陷的修复成果。

### 未知与重新调查条件

本轮没有验证所有 TypeScript 5.x compiler 的 mapped-tuple 行为，也没有统计生态中依赖当前错误 `never` 或 array widening 的实际 consumer。若项目要扩大 compiler support、公开 `DeepReadonly` 为 named root、约束 Options 为某个 static canonical JSON type、引入 TypeBox tuple schema，或推进全仓 `noUncheckedIndexedAccess`，需要按新的兼容与验证边界重新调查。

## 随附资源

- [DeepReadonly 类型探针](./_resources/260910-diagnose-deep-readonly-option-type-erasure/deep-readonly-probes.ts)
- [编译、运行与范围观察摘要](./_resources/260910-diagnose-deep-readonly-option-type-erasure/observations.txt)
