# Proposal

在保留现有检测政策的前提下采用已确认的 CSV、Markdown 与重复检测上游修复。这是本次已授权实施的临时计划。

## Why

csv-parse、markdownlint 和 jscpd 均存在与现有消费路径有关的新版修复，且部分新版会改变 Findings 或行数计量。

## Outcome

使用 csv-parse 7.0.3、markdownlint 0.42.0、jscpd 5.4.2；固定语料上的结果差异有解释，exact-input、失败阻断、缓存及 consumer 契约仍成立。

## Scope

### Intended Change

统一升级三个根/发布依赖，按旧版固定语料对比新版解析、范围、计量与 Findings；只为已确认兼容影响修改 adapter、测试和 owner。

### Resulting Impacts

freeze baseline 在安装前完成；比较多语言 pair/path/range/lines/tokens、Markdown 规则/位置/waiver/cache 与 CSV 数组解析。发布 jscpd 保持 owner 的有界 v5 provenance policy，不将版本 probe 改成 exact-version 产品政策，不启用新检测模式或调整阈值掩盖修复。
markdownlint 的 micromark/core 实例约束由最窄 transitive lock 对齐满足，避免 shim 作用于未被 parser 消费的副本；不增加 Product parser 替代层。
根 override 不随包传播，因此 MD052 另以私有、单进程一次的公开 API capability probe 防止消费者旧锁图静默漏报；
direct 与 cache 命中均先验证，失败沿用 backend-failed，adapter 契约版本提升使旧 findings 失效。

## Success Criteria

- 目标版本及实际安装、发布清单一致，最窄行为证据和最终完整 Gate 均通过。
- 实际差异、稳定 owner、Case 与必要交接同步；按本轮授权保存 Git 完成态、运行提交 hook 并正常结项，正式发布另行授权。

## Affected Owners

docs/checks/duplicate-detection.md；docs/checks/markdown-lint.md；docs/development/scanner-dependencies.md；对应 package-checks adapter/tests 和 Cases。
