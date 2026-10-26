# AI-ready 第二阶段保护性基线审计（只读）

- Git 当前分支为 `main`，HEAD 为 `9a5be25bf02886e5271b96b31da35ae98c3ca680`；index/stage 无改动。
- 422 个 tracked 工作树改动和 12 个 untracked 非忽略路径均在允许范围：`docs/decisions/**`、`docs/investigations/**`（含 index）、`docs/governance/change-coordination.md`、当前 `changes/refresh-governance-records/**`。越界路径 0。
- `docs/investigations/_resources` 对 HEAD 基线树逐项核对（包含文件哈希、目录、工作树未跟踪/忽略条目）：HEAD/current 均 974 个树项；增加、删除、内容变化、忽略路径均为 0。
- `src/`、脚本、测试、依赖清单/lockfile、hooks 改动均为 0。
- 本轮使用 `uv run --no-project python` 执行只读审计脚本。未运行任何 check/validator，不写正式文档/Change，不 stage/commit；该保护性结果保存在本目录 `protection-audit.json`，可由 `protective_audit.py` 复跑。
