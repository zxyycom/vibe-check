---
title: 预置有限的 TypeScript 实现能力
status: archived
alignment: aligned
createdAt: 2026-08-11T07:39:34Z
purpose: 让常见实现问题有稳定且边界明确的项目能力，避免每次实现临时选库或并存多套等价抽象。
background: 编码规范已按问题形态选择模型；重复临时选库会扩大维护面，并让同类实现产生不一致表达。
decision: 预置 neverthrow、ts-pattern、Remeda、Mnemonist 和产品自制 Option；只按对应问题形态使用，不引入重叠替代。
tags:
  - workflow-policy
relations: []
---

## 目的
- 为常见且已经调查的问题形态提供可直接使用的默认能力，减少实现者在等价库之间的临时选择。
- 让第三方依赖、本地原语、使用边界和复核材料都有唯一 owner，避免同一职责出现多套表达。

## 背景
- Vibe Check 使用 strict TypeScript、NodeNext 和 Bun，需要预装能力能够通过当前类型、模块和
  运行边界验证。
- 编码规范要求先识别问题形态，再选择能显式呈现不变量、数据流和失败路径的实现模型。只有
  选择原则而没有稳定能力，会让相同问题重复选库；无边界地预置能力则会造成重叠抽象和随机风格。

## 决策
- 采用: 根项目精确锁定 `neverthrow`、`ts-pattern`、`remeda` 和 `mnemonist`；当前版本由
  `package.json` 与 lockfile 承接，不在决策中复制可变版本事实。
- 采用: `src/product/foundation/option.ts` 单点拥有项目自制 `Option`，以存在/缺失语义
  补充 `neverthrow` 的成功/失败语义，并通过 `toResult` 在边界衔接；脚本或消费方不得复制
  第二份实现。
- 采用: 各能力只在 `docs/coding-style.md` 声明的问题信号出现时使用。预置不构成迁移要求，
  原生控制流和集合已经清楚时继续使用语言能力。
- 不采用: 不同时预装职责重叠的 Result、Maybe、模式匹配、utility 或数据结构库。需要更宽的
  FP 体系、状态机、不同错误模型或新数据结构时，以新的真实缺口重新调查。
