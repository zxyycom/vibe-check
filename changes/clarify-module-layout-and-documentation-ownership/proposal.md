# Proposal

本 Change 落实两轮命名与目录普查的有证据整理，不改变产品公开行为或整体分层。

## Why

局部文件名称落后于真实职责，用户指南混入内部和未来状态，机械命名门禁与语义规范不一致。
部分同前缀文件已经形成稳定子职责，另一些拥挤目录主要由测试或自然同级成员构成，不应机械拆分。

## Outcome

维护者能从文档、路径和名称定位当前职责与执行阶段；共同契约由真实 owner 承接，消费者材料自足，
无用途的私有中转退出，稳定子职责由恰当目录表达，同时保持公共 API、运行结果和证据完整性。

## Scope

### Intended Change

- 清理 callbacks 公开指南的内部/未来内容和旧示例，修复已确认文档失配，独立 admission-workbench 文档入口。
- 将历史 report schema/example 归入历史材料分组，保留原始 bytes 与显式校验。
- 对齐语义命名规则和布局校验，提升共同 validation 扫描政策，重定全包 Markdown collector 与 API 分类责任。
- 明确 Product-only test 命令范围，不改变默认执行集合。
- 清理 Product 私有 Git/helper/re-export 残留，统一同职责构造入口，澄清静态计划和结果阶段命名。
- 提取 workbench 评估子模块；按真实依赖审查 Scheduler decision 和 Markdown parse-facts cache 文件组，实施有边界收益的局部归组。
- 按编码规范复核移动后的实现，修正评估协议消费字段的边界校验与扫描政策的增量验证依赖。

### Resulting Impacts

- 同步 import、构建/文档/验证 registries、测试 entity 路径、Case 映射和当前 owner 引用。
- 移动测试保持证明目的与 Case ID；历史报告与冻结 evidence 的形成时内容不因路径调整重写。
- 涉及包交付和多个 owner，运行局部测试、材料/Case 检查、typecheck/lint 与完整 Gate，并独立反查文档影响。
- 协议校验修正单独验收非法输入拒绝，保留合法输入、冻结 bytes 和 Product 行为；路径迁移补齐 Gate 增量选择。

## Success Criteria

- 当前消费者指南不依赖未发布 owner 或未实施方案；公开示例通过既有验证入口。
- 文件布局与命名准确表达职责，扫描与材料契约不倒挂，不新增兼容转导或全局工具桶。
- API/运行语义和历史材料 bytes 保持；所有当前引用、测试证据与包材料闭合。
- 没有因为文件数量、名字长度或同前缀机械拆分；候选未采用时记录具体理由。

## Affected Owners

架构、编码规范、Project Run、Scheduler、Markdown Link、Workspace tooling、Documentation、Repository material validation、
Package artifact、Test strategy/Case maintenance 以及对应公开指南。各 owner 从文档导航进入。
