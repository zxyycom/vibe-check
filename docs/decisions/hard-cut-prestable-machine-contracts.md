---
title: 对预正式 machine contract 执行单版本硬切
status: active
alignment: aligned
createdAt: 2026-08-15T03:47:14Z
purpose: 让正式稳定版本前的 breaking machine shape 使用真实新版本身份，而不承担旧版本兼容实现。
background: 产品与 package 尚未进入稳定版本，保留 dual writer、reader 或 migration shim 会固化短命 schema 并扩大验证成本。
decision: 预正式阶段的 breaking machine contract 递增 schema version 后单版本硬切；旧 writer、reader 和兼容路径同时退出。
tags:
  - product-contract
relations: []
---

## 目的
- 允许 Product 在首个稳定兼容承诺前直接修正 machine artifact 的实体、字段和关系模型。
- 让 schema identity 如实区分 breaking shape，同时避免维护未发布旧版本的运行时兼容层。

## 背景
- 该决策形成时，machine contract 仍处于产品形成阶段，计划中的 Core definitions/runs → checks/records 迁移会改变 run document、Record owner 和 reference shape。
- 在同一 URN 下改写 schema bytes 会让保存的 artifact 含义漂移；同时维护旧新 writer/reader 又会形成双 owner 和额外测试矩阵。
- 版本号递增只表达 machine shape identity，不等于继续支持读取或生成旧版本。

## 决策
- 采用: 在产品 owner 明确开始正式稳定兼容承诺前，任何 breaking machine contract 都创建新的 schema version 与 URN，并在同一 Change 中完成 single-active hard cut。
- 采用: hard cut 同时删除旧 runtime writer、reader、mapper、validator、example 和默认文档入口；不提供 dual writer、permissive reader、fallback、自动迁移或 deprecation window。
- 采用: schema、runtime model、reference invariants、human-readable projection、examples、validators、docs 与 downstream acceptance 必须在同一次变更中同步到唯一 active version。
- 采用: 已保存的旧 artifact 只由其历史 schema identity解释；当前 runtime 不承诺继续读取。schema version bump 是诚实标识 breaking shape，不是兼容承诺。
- 采用: 进入正式稳定版本后是否提供 backward compatibility、支持窗口或 migration tooling，必须由产品 owner 另行作出明确决策，不从本预正式策略推断。
- 不采用: 为尚未稳定的 schema 保留 compatibility shim，或在不改变 version identity 的情况下覆盖旧 schema bytes。
