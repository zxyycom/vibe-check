---
title: 观察使用中性默认，阻断使用文件政策
status: archived
alignment: null
createdAt: 2026-08-04T03:37:21Z
purpose: 让外部项目直接获得中性质量观察，并让阻断行为由项目持有的完整政策驱动。
background: 观察需要通用起点；阻断需要可审阅、可提交且完整记录实际 scope、threshold 和 report policy 的配置。
decision: 非 gate 扫描可直接使用中性默认；任一 gate 使用完整文件配置；init 完整落盘同一默认值。
relations: []
---

## 目的
- 让 external project 可以直接运行 non-blocking observation。
- 让 blocking gate 使用项目明确拥有、可审阅和可提交的 complete policy。

## 背景
- External project 的通用观察政策由 Product-owned complete neutral default 提供，repository
  policy 只服务其所属项目。
- Gate 的 file prerequisite 需要固定实际 policy。`init` 输出完整 document，使 scope、quality
  values、report 和 paths 都成为项目持有的显式输入。

## 决策
- 采用: Product Config 维护一份 complete、tool-neutral、repository-neutral semantic default，
  服务 ungated scan 的直接观察入口。
- 采用: Config selection 顺序为 explicit `--config`、fixed `.vibe-check/config.json` discovery、
  ungated neutral default。Selected file 是本次 invocation 的 authoritative policy 和 validation
  result。
- 采用: 任一 gate policy 使用 explicit 或 discovered complete config，并在 scan work 前完成
  config validation。
- 采用: `init` 将同一 neutral default 完整 materialize 为 project config 并生成 editor schema；
  neutral default 只承诺当前 product revision 的 observation policy。
