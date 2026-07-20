# add-ci-quality-gates

## Core Purpose

让启用 gate 的 CI 只有在所需扫描与比较成功完成、且所选 warning 范围不存在未接受问题时才通过，否则以明确退出码阻断。

## Scope

本 change 交付 opt-in `--gate`、core-owned `GateResult`、明确退出码、跨 output 的一致
结果和仓库 regression-gate dogfood 入口。省略 `--gate` 时保持当前非阻断行为。

Proposal 说明产品价值与成功标准；design 说明状态、所有权和扩展边界；spec deltas 定义
可观察契约；tasks 定义实现顺序与交付证据。
