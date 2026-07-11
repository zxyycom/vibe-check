# integrate-rust-jscpd-adapter

把 jscpd v5 Rust engine 接入为 Vibe Check 的 duplicate-code scanner adapter。

## 结论

可以接入，方便程度中等偏方便。第一版使用 exact `cpd-finder 0.1.8`、项目固定的 Rust `1.96.0` 工具链和不可变内置扫描 profile，不扩展用户配置。

用户可感知结果是：supported source 中达到默认阈值的重复片段会产生 deterministic `duplicate.code_fragment` warning；unsupported / excluded input 不会产生该 warning；局部扫描问题形成 partial report，无法信任结果时返回 scanner fatal error。duplicate warning 第一版为 `medium`、non-blocking，不单独让 gate failed。

## 文档入口

- `proposal.md`：变更目标、用户体验、范围和受影响 capability。
- `design.md`：adapter 决策、默认扫描 profile、错误边界和迁移计划。
- `source-audit.md`：jscpd Rust 前置探索、API 事实和实现约束。
- `tasks.md`：按 owner docs、dependency characterization gate、实现、contract evidence 和 final verification 排序的 checklist；文档 gate 与 dependency gate 通过后才进入完整 Rust 实现。
