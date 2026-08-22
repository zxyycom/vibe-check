---
title: 公开最小 Check authoring 与 Run surface
status: active
alignment: aligned
createdAt: 2026-08-21T15:02:47Z
purpose: 让 package 公开唯一递归 Check/Run model 和实际 consumer 所需 roots，不再导出已退休 evaluation 或 Record catalog surface。
background: 单一普通 Check 和唯一 Run 仍是边界；旧 evaluation 与 Record catalog roots 已退出 Product contract。
decision: 保留唯一 Check/Run 与四态 result/minimal Record types，删除 retired evaluation/gate/catalog roots。
tags:
  - product-contract
relations:
  - type: 修订
    target: expose-recursive-check-authoring-and-run-surface.md
---

## 目的

- 让 Project authoring、runtime imports、generated declarations、docs、dogfood 与 package consumer 使用同一个小而完整的 public symbol set。
- 保留 recursive ordinary Check values、direct execution、minimal Record reporting、four-state result 和唯一 Package Run 的实际消费边界。
- 防止已退出的通用评估器、独立 Gate result、Record catalog 和 shared baseline/reference vocabulary 通过 declaration roots 继续成为 Product contract。

## 背景

- `defineConfig`、`defineCheck`、`inherit` 与 `run` 分别形成 Project Definition、改善 contextual typing、编辑 inheritable collection 与执行 Product work；只有 `run` 执行。
- Default Checks 仍是完整 ordinary Check values，project 通过 native object composition 使用或修改它们；来源、tree role 或 execution variant 不需要第二 Check family。
- consumer 需要命名Check authoring、execution context、four-state Check facts、Project Definition、Run Controls与Run Result types；Record reporter通过execution contextual typing提供，minimal Record facts通过Run Result读取，不需要额外top-level reporter/fact roots或retired evaluation/catalog types。

## 决策

- 采用：public runtime values 仅保留 `defineConfig`、`defineCheck`、`inherit`、`run` 和 Product-provided complete ordinary Check defaults；不增加第二运行入口、runtime evaluation operation 或 catalog service。
- 采用：public type roots覆盖ordinary recursive Check authoring、direct execution/context、four-state Check result/outcome/reasons、Project Definition、Run Controls、Run Result、effects、scheduler与默认Check options；Record identity/reporter只通过execution contextual typing出现，Record facts只通过Run Result结构读取，并以isolated consumer evidence约束额外named exports。
- 采用：declarations、public-contract inventory、docs、examples、repository dogfood 与 exact package consumer acceptance 单向核对同一 public symbol set；supporting declaration type 不自动成为 runtime export。
- 不采用：retired evaluator、selected evaluator、独立 Gate result、Record type/catalog/field/identity extractor roots、shared baseline/reference reporter roots、second Check node family、TaskPlan/factory/completion surface、wildcard/internal subpath exports、deprecated alias 或 public fallback adapter。
