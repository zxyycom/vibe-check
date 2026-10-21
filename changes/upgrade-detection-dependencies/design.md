# Design

在保留现有检测政策的前提下采用已确认的 CSV、Markdown 与重复检测上游修复。

## Context

三份 assess-csv-parse/markdownlint/jscpd-upgrade 调查；jscpd provenance 与 bounded markdown lint 活动 Decision。
当前 main 基线为 a36600da4aa2e4d3f4dcebb87722e56d1200ee9d；开始时已有十九份未提交升级报告和调查索引，作为既有工作保留。

## Goals / Non-Goals

目标：使用 csv-parse 7.0.3、markdownlint 0.42.0、jscpd 5.4.2；固定语料上的结果差异有解释，exact-input、失败阻断、缓存及 consumer 契约仍成立。
范围以本组已批准依赖和必要适配为限；不升级其余根库、不改变 mise/Node 支持范围、不修改既有调查的历史认识。

## Decisions

### Intended Change

统一升级三个根/发布依赖，按旧版固定语料对比新版解析、范围、计量与 Findings；只为已确认兼容影响修改 adapter、测试和 owner。

### Resulting Impacts

freeze baseline 在安装前完成；比较多语言 pair/path/range/lines/tokens、Markdown 规则/位置/waiver/cache 与 CSV 数组解析。发布 jscpd 保持 owner 的有界 v5 provenance policy，不将版本 probe 改成 exact-version 产品政策，不启用新检测模式或调整阈值掩盖修复。
所有 package.json、pnpm-lock.yaml、node_modules 和 release-manifest 由 compiler_dependency_integration 单一 owner 串行写入；其余模块按明确所有权并行。主代理维护四组计划和最终验收，完整 Gate 在实现稳定后统一运行，失败时定向修复并重验，四组共享同轮证据。

## Risks / Trade-offs

新版行数/范围修正可能改变 Findings；旧测试基线发现的差异要先区分既有问题，不把改预期当作兼容证明。

## Open Questions

当前方案已由用户确认。安装、行为差异与平台边界按实际验证更新，实质扩大范围时再确认。

## Implementation Observations

新版首次对照使 MD052 漏报：markdownlint 0.42 的 shim 修改其直接解析的 micromark core，
而 lock 保留的 micromark 路径解析到另一 core 版本。先由统一依赖 owner 最窄对齐 transitive graph，
再以公开规则和相同固定语料复核；不复制 parser、不删规则或降低预期。根 override 不能保证消费者保留旧 transitive lock 的升级图，
因此在选中 reference-links-images 时做一次公开 strings API capability probe，验证固定未定义引用样例。
同进程 Promise 去重；direct 和 cache lookup 前共用，失败沿用 backend-failed，不读取/发布旧 facts，其他规则不受影响。
这项 adapter 解释变化提升 findings cache 契约至 v2，不引入新 reason/options。该跨包实例边界的问题按知识治理沉淀独立 Investigation。
旧版正式 pin 下的目标测试通过；ambient Bun 的 null-prototype deepEqual 差异只作为旁证，
测试以公开 parser 读取 canonical data，保留原状态和精确计数。
