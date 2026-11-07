---
title: "Rust 函数指标补丁的修复价值与采用条件"
id: "261107-assess-rust-analyzer-user-patch"
formedAt: "2026-11-07T09:47:12Z"
question: "用户补丁改善了哪些 Rust 函数指标问题，采用前还需解决什么，Markdown 缓存部分如何处理？"
tags:
  - "bug"
  - "function-metrics"
  - "patch-review"
  - "rust"
relations: []
---

## 形成时背景

用户提供一份涉及 Rust 函数指标与 Markdown lint 缓存的补丁，希望确认其针对的问题及适用性。
本轮于 2026-11-07 以 `main` 的 `31230d00` 源码为基线开展核验。

## 调查目的

识别基线缺陷、补丁收益和采用条件，为维护者选择修复范围与后续验证提供依据。

## 调查范围与依据

按 [functionMetrics 公开契约](../checks/function-metrics.md)与 [scanner 实现边界](../development/scanner-dependencies.md)，
通过产品私有入口 `analyzeLizardSource` 对比十个 Rust 片段。下文“基线”指原源码，“候选”指在内存中应用三个 analyzer TypeScript 源文件补丁后的实现。
Node `24.18.0` 执行两侧分析，`rustc 1.98.1`、edition 2024 验证全部片段可编译；Bun `1.4.4` 运行八个既有定向测试，全部通过。

指标缩写：CCN 为圈复杂度，ND 为最大嵌套深度。随附资源保存来源、实验方法、完整样本与命令，供逐项复核。

## 调查结果与边界

**Rust 基线确有指标错误，补丁有修复价值，但需先解决其回归再采用。**
Markdown 缓存部分在基线中已有等价修复：`getVersion()` 返回 `0.42.0`，冷/热缓存及版本不可用相关既有测试通过。

### 已验证的修复收益

| Rust 场景 | 基线 → 候选 | 修复价值 |
| --- | --- | --- |
| 泛型、元组与函数指针类型混合的三个参数 | 参数数 5 → 3 | 恢复顶层参数计数。 |
| trait 声明后接默认方法正文 | 函数名 `required` → `defaulted` | 恢复正文归属。 |
| 原始字符串后接 `if` 与普通字符串 | CCN 1 → 2，ND 0 → 1 | 恢复字符串外控制流计量。 |
| 正文内的函数指针类型与闭包 | 额外空名函数 → 仅 `outer`，其 CCN 2 → 3 | 恢复函数边界与贡献归属。 |
| 连续三个错误传播 `?` | ND 3 → 0，CCN 保持 4 | 将错误传播与三元嵌套区分。 |

### 采用前需解决的问题

1. **保留完整函数身份。** 候选把基线可识别的 `fn 计算(...)` 漏为零结果；换行声明的起始行从 `fn` 所在的第 1 行移到第 2 行，影响位置与 waiver identity。
   名称处理应保留 Unicode 与声明起始位置；两侧均未识别的 `fn r#type(...)` 属于既有缺口，可另行确定修复范围。
2. **区分类型与 const 表达式。** const 比较中的 `<` 被候选当作泛型起始符，导致一个合法签名的参数数从正确的 2 降为 1。
   参数解析应保留顶层分隔逗号，具体签名与状态原因见资源说明。
3. **确认 Rust ND 口径。** 候选将 `a && b` 的 ND 从 1 改为 0；现有 ND 本就是包含短路状态路径的启发式指标。
   该变化应作为计量定义选择确认并同步公开说明，与错误传播 `?` 的修复分别判断。

### 证据边界与后续验证

本轮交付为调查与复现资料，产品修复另行实施。候选证据覆盖十个样本的内存运行；八个既有测试验证的是基线行为，尚未保护新增反例。
后续采用需补直接回归测试，并取得类型检查、lint、共享 GoLike reader 回归及实际构建验收证据；按改动同步公开 ND 说明与来源偏差/identity，构建产物沿现有 package 流程生成。
结论适用于上述源码基线；安装包问题需取得精确版本与失败输入后另验。

## 随附资源

- [用户补丁中的三个 Rust 源文件 diff 段](./_resources/261107-assess-rust-analyzer-user-patch/candidate-rust.patch)
- [双进程内存对比驱动](./_resources/261107-assess-rust-analyzer-user-patch/compare-rust-patch.mjs)
- [实验方法、样本解释与复核命令](./_resources/261107-assess-rust-analyzer-user-patch/evidence-notes.md)
- [Node 24.18.0 十个样本的两侧结果](./_resources/261107-assess-rust-analyzer-user-patch/results.json)
