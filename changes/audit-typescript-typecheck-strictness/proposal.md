# Proposal

本 Draft 审计 Vibe Check 的 TypeScript 类型检查严格度、作用范围和公共声明验收，形成以独立证明价值和诊断证据为依据的规则策略。

## Why

`DeepReadonly` 调查同时暴露了两类缺口：现有 `strict` 配置未通过 `noUncheckedIndexedAccess` 显示 tuple 退化的常见症状，而 `unknown -> never` 的不安全映射又只能由语义类型契约测试捕获。临时开启单个规则已在 product 与 scripts 范围产生大量未分类诊断。项目需要先恢复各检查边界的实际保证并分类诊断，再选择能够增加独立证明价值的规则。

## Outcome

项目获得一份按 Product source、repository scripts/tests 和 exact installed consumer 分区的 TypeScript 检查策略：明确采用或不采用的 compiler rules、诊断分类与处理原则、公共声明的严格 consumer profiles、Gate/开发入口及分阶段实施边界。后续实现以显式类型建模、运行时 guard 或有证据的局部 assertion 处理诊断。
