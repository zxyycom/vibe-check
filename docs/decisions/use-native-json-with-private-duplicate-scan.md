---
title: 严格 JSON 采用原生语法验收与私有查重
id: 261015-use-native-json-with-private-duplicate-scan
status: active
alignment: aligned
createdAt: 2026-10-15T03:12:42Z
purpose: 保持严格 JSON 与重复键拒绝，以窄扫描责任降低解析成本
background: 两宿主原型已证明局部收益，用户确认由项目维护合法原文上的解码键查重
decision: 采用原生 JSON.parse 完整语法验收、私有解码键查重与迭代安全值投影，移除 Momoa
tags:
  - dependency-policy
  - performance
  - product-contract
relations:
  - type: 替代
    target: 260824-use-momoa-for-strict-json-document-boundary
    summary: 以原生语法和自有窄查重替换 AST 取证成本
---

## 目的

- 保留完整 JSON 语法和解码后重复键拒绝，以原生解析与窄扫描降低运行成本。

## 背景

- [复查调查](../investigations/evaluate-strict-json-parser-replacement.md)在 Node、Bun 上取得行为对照与多类输入收益，
  支持用原生语法验收、查重和安全值处理的组合替换 AST 路径。
- 用户确认重复键属于质量问题，并明确采用原生语法验收加私有查重的方案。
  原 Momoa 决定以 AST 降低自维护风险；本决定基于新证据接受窄扫描器的长期维护责任。

## 决策

- 采用: 原生 `JSON.parse` 拥有完整语法验收，私有扫描器随后检查同一合法原文。
  自有扫描责任限于字符串边界、容器层级和每个对象的解码键集合，转义键由原生解析器解码。
  键名按解码后的原值精确比较；同值、嵌套和转义后同名成员均拒绝，完整语法错误优先于重复键。
- 采用: 新解析值在私有边界内迭代处理，全部容器冻结，JSON 对象原型设为 `null`，数组保留数组原型，
  特殊键、负零和数值溢出语义保持。字节、读取、错误顺序、取消和结果继续遵循
  [JSON 文档契约](../checks/json-validation.md#工作原理)；内部失败为 `unavailable`，原文、键名和原生错误细节不公开。
- 采用: JSON Check、本地 schema、instance 与受控远端 schema 共用一条私有生产路径；移除 Momoa 运行依赖，
  公开 API 和后端配置保持不变。
- 采用: 完整方向须由两宿主行为、同输入性能、包材料、isolated consumer 和完整 Gate 验收；
  并发、资源配置与既有预算保持不变；性能和深度结论以相应验收覆盖的输入及运行范围为限。
