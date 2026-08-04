---
title: 使用固定语义配置契约版本
status: archived
alignment: null
createdAt: 2026-08-03T09:23:47Z
purpose: 让 project config version 稳定标识文档契约，而不是承担调用者自定义的缓存失效责任。
background: 当前 version 是任意字符串并参与 scanner cache identity；新的语义 schema 需要可验证的版本判别，同时缓存应由实际影响测量的输入决定。
decision: Semantic project config v1 固定使用 version "1"，缓存身份改由相关语义设置、精确输入和内部 dependency identity 派生。
relations: []
---

## 目的
- 让 runtime schema、generated schema、starter、examples 和 migration diagnostics 对同一份
  semantic project config 契约有唯一、可验证的版本标识。
- 让 cache invalidation 反映真正影响 normalized measurement 的输入，不要求项目维护者手工
  修改任意 label 来修复缓存正确性。

## 背景
- 当前 `QualityConfig.version` 接受调用者自选字符串，并被 measurement cache identity 使用；
  它没有可靠地区分 public document shape。
- Tool-neutral semantic config 会建立新的 closed field tree。如果继续让 version 同时表示
  schema contract 和任意 cache-bust label，runtime validation、provenance 与缓存责任会保持
  混杂。
- Current、baseline 与 Git-failure fallback 需要复用同一个 resolved config snapshot；各
  scanner cache 只应投影自身 measurement-relevant semantic values、exact inputs 和 backend
  identity。

## 决策
- 采用: Semantic project config v1 的 public `version` 必须精确等于字符串 `"1"`；它是
  document-contract discriminator，不是用户自定义标签。
- 采用: Runtime schema、derived type、generated schema、starter、canonical examples、console
  provenance 与 machine `metadata.configVersion` 对该契约版本保持一致。
- 采用: Scanner cache identity 按 capability 从 measurement-relevant semantic settings、exact
  input fingerprint 和 relevant internal dependency identity 确定；不得把 public version 当作
  唯一 invalidation signal，也不得用全量 config hash 代替 consumer-specific 审查。
- 采用: 未来需要不兼容 document shape 时，通过独立 contract change 引入新版本和迁移，
  不允许调用者自行发明 version value。
- 不采用: 保留任意 `version` 字符串并继续让项目维护者手工 cache bust。
