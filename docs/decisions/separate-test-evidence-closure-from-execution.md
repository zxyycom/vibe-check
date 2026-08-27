---
title: 将测试实体闭合与测试执行拆为独立 assurance
status: active
alignment: aligned
createdAt: 2026-08-26T16:55:29Z
purpose: 让完整测试身份闭合不再强制由同一个 Check 串行执行全部测试，同时保持每项行为测试的独立失败事实。
background: 当前 Test Evidence 为取得 Bun JUnit 身份而执行全部测试，静态与 Case 校验不足一秒，而 package lifecycle 测试支配二十余秒关键路径。
decision: Test Evidence 用完整测试面的静态声明与 Bun 注册报告闭合实体，实际测试由覆盖同一文件集合的独立 Gate execution 子 Checks 执行。
tags:
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: use-semantic-test-case-closure.md
---

## 目的

- 保持完整当前测试实体、语义 Case 和实际行为执行都可独立失败并被 Gate 聚合。
- 避免为了恢复 runner identity 而要求一个 Test Evidence Check 同时承担全部测试执行与调度。
- 让成本和资源特征不同的测试可以由 Project Gate 建立明确、可审阅的 execution 子 Checks。

## 背景

- 当前受支持测试面包含 `src/**` 与 `scripts/**` 下的 Bun tests；静态扫描、文件集合解析和 Case 目录校验只占 Test Evidence 很小一部分时间。
- Bun JUnit 在使用不匹配 test-name pattern 时仍会加载测试文件、注册全部测试，并报告精确的 file、line、suite 与 name；形成该决策时的测试面实验得到 216 个注册身份，且与当时的完整执行报告完全相同。
- 实际测试通过与实体存在是两个事实：前者证明行为，后者与静态声明共同证明当前实体和 Case mapping 没有漂移。把它们放在同一 Check 不是语义闭合的必要条件。
- 只依赖静态 AST、提交派生清单或历史缓存会丢失 runner registration 事实，不能替代运行时注册报告。

## 决策

- 采用: Test Evidence strict check 继续从完整受支持测试面重新解析文件，执行静态 discovery，并取得 Bun runtime registration JUnit report；规范化后的静态实体与注册实体必须完全相等，随后继续执行完整 Case 双向闭合。
- 采用: registration report 必须证明全部选定测试文件成功加载、全部实体具有 runner 报告的 file、line、suite 与 name，且报告中的测试均因专用不匹配 pattern 被跳过；不能从静态结果补造 runner 缺失字段。
- 采用: 实际测试通过由独立 Project Gate process Checks 证明。Gate-owned execution partition 必须覆盖与 Test Evidence 相同的完整文件集合，每个文件恰好属于一个子 Check，遗漏和重复都在启动测试前失败。
- 采用: execution 子 Checks 按稳定 owner 与资源特征拆分，并分别拥有 profile、tag、transcript、取消和失败结果；一个子 Check 不重新承担 Test Evidence 的 Case mapping 责任。高成本 Checks 可以通过已有 scheduling fields 约束资源竞争，但不能因此合并其 terminal fact。
- 采用: 语义 Case 仍映射完整当前实体，不因某一 invocation 没有选择某个 execution 子 Check 而删除、降级或生成第二套 inventory。
- 不采用: 继续用一个 Test Evidence Check 串行承担全部测试执行、只做静态发现、提交派生实体清单、从失败或缺字段的 JUnit 推断 identity，或用缓存成功结果替代当前 invocation 的已选测试 execution。
