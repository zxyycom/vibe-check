---
title: 让语义 check ID 直接属于质量记录目录
status: archived
alignment: null
createdAt: 2026-08-05T07:09:36Z
purpose: 让project config、能力输出和决策策略共同引用同一个稳定质量检查身份，而不经过旧warning或scanner identity映射。
background: QualityRecord已直接携带final check语义，继续映射旧warning fields会保留第二套身份owner。
decision: Registry catalog直接拥有checkId；config selector与acceptance annotation引用它，不保留旧warning身份映射。
relations:
  - type: 替代
    target: configuration/use-semantic-check-ids-in-project-config.md
---

## 目的
- 让项目维护者、capability、machine consumer和decision policy使用同一个稳定Vibe Check检查身份，不需要知道scanner backend或历史warning shape。
- 让backend replacement与machine hard cut都只在各自owner边界处理，不继续维护check identity桥接层。

## 背景
- Compile-time capability现在直接emit带`capabilityId`与`checkId`的final semantic `QualityRecord`，registry catalog已经是check语义、fields、levels与relations的唯一公共目录。
- 将semantic check ID再映射到`ruleId`、`sourceTool`、fixed channel membership和record内`acceptedReason`会建立第二套身份与输出owner，并与single-active machine v2冲突。
- Acceptance已经成为immutable policy annotation；它不需要也不应改写record本体。

## 决策
- 采用: Compile-time registry的record catalog直接拥有stable semantic `checkId`；capability output、public config selector、acceptance rule、named view和machine catalog均引用同一ID。
- 采用: Public config继续不得暴露scanner name、command、args、`ruleId`或`sourceTool`；backend replacement只更新internal adapter，不改变semantic check identity。
- 采用: Acceptance产生独立`recordId`/`ruleId`/reason policy annotation，不把`acceptedReason`写回`QualityRecord`，也不改变record level、identity、ordering或comparison relations。
- 不采用: 维护`checkId`到legacy warning identity、fixed channel或MachineWarningV1 fields的兼容映射。
