# Design

以材料的实际范围命名和放置说明，分离上游原文、项目归属说明与安装验收机制。

## Context

已读 notice、Lizard/Pygments provenance 和对应源码头，没有发现已陈述来源的直接冲突，但根标题范围宽泛且混入非 consumer 内容。用户明确批准移除根 notice、保留原文及源码头，并把简短翻译归属放入 licenses。当前 legal inventory 与 audits 对路径和正文有多处绑定。

## Goals / Non-Goals

目标是读者从路径与正文直接识别这只是实际携带翻译代码的归属说明。非目标为复制完整动态 npm 图、修改许可文本、重新判定许可兼容性、发布 manifest 静态化或改写旧 release evidence。

## Decisions

### Intended Change

- 使用 licenses/analyzer-translations-NOTICE.md，包含 Lizard/Pygments 来源、修改状态和相邻原文/provenance 导航。
- 移除 deferred-body 计数、candidate installation 流程和无关总声明；这些事实继续由各自维护者 owner 承接。
- 上游固定原文 identity 与来源闭合仍保留；项目自写说明以 repository material bytes 为权威，不再要求固定叙述片段自证。

### Resulting Impacts

- 更新 package inventory、manifest files 与 material reader/audit；receipt 只记录新构建的新材料身份。
- 目标测试需覆盖根旧文件不再发布、新文件实际携带、原文不变与正文漂移检测。
- 长期材料布局决策的根 notice 要求被新方向修订，完整安装依赖审计的独立边界保持。

## Risks / Trade-offs

文件移动会使旧固定 hash、人工短语断言或 consumer 链接失效，需按实际调用链闭合。此整理不证明归属材料在任一司法辖区的法律充分性；不因根位置变化删除原文、来源信息或源码头。运行策略对治理查询的拒绝需如实记录，不手工伪造生命周期成功。

## Open Questions

无方向性待决事项。精确验收改动以实际 diff 确认，发现额外 upstream 材料义务疑问时另行核查，不扩大为法律结论。
