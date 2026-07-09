# integrate-rust-jscpd-adapter

尝试把 jscpd v5 Rust engine 接入为 Vibe Check 的 duplicate-code scanner adapter。

## 结论

可以接入，方便程度是中等偏方便：`cpd-finder` 的 Rust API 足够直接，license 匹配；但要接成 Vibe Check 的稳定 scanner contract，需要处理 scan scope 对齐、MSRV `1.87`、path normalization、pairwise clone model 和 upstream silent skip 行为。

## 文档入口

- `proposal.md`：变更目标、范围和受影响 capability。
- `design.md`：adapter 决策、取舍、风险和迁移计划。
- `source-audit.md`：jscpd Rust 前置探索、接入结论和实现约束。
- `tasks.md`：消费 `source-audit.md` 的实现 checklist，避免 apply 阶段重新做大范围上游探索。
