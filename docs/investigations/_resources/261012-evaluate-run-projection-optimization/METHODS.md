# Run 投影实验的复核与脚本身份

结论与采样条件归[主报告](../../evaluate-run-projection-optimization.md)。本页区分形成时证据、审查后 helper 和重跑准备。

## 阅读顺序

1. `summary.json` 汇总 14 workload、56 进程的中位数/MAD/范围和相邻对变化；`raw/` 保存各进程观察。
2. `identity.json`、before/candidate source manifests、`candidate.patch` 标明测量源码；`implementation.patch` 与行为材料说明生产落地。
3. `raw/count-*.json` 和 `raw/cancellation.json` 是单独非计时证明，不用于估计 wall time。
4. `helper-source-history.json` 保存五份原始 helper 的完整源文本与 SHA-256。`artifact-sha256.txt`、`identity.json.script` 及 raw 的 `scriptSha256`
   仍指这些原始字节，不指当前整理后的四份 MJS 和一份 shell；需要复核旧 checksum 时按 `originalPath` 取对应 `sourceText` 的 UTF-8 字节。

## 审查后的辅助代码

当前 helper 使用清晰 argv 拒绝、具名文件 IO 阶段和 JSON 领域校验；summary 解码核对文件身份、采样结构、runtime、source side 与 hash，
避免未知文件被默认为 Bun/candidate。`run-window.sh` 在任何 IO 前拒绝参数，固定窗口主体保持原字节。
原 raw、源码快照、patch 和原 checksum 清单保持。

最窄复核以 56 份归档 raw 重算，生成的 summary 与原 summary 整对象深等；六种 malformed JSON/字段输入明确拒绝并含文件名，
三个 MJS helper 的非法 argv 在 IO 前拒绝。shell 另经语法检查、隔离的无参数 guard 与三种非法 argv 验证，未执行窗口主体。
nested manifest 的有序路径/hash 与原实现一致，symlink 拒绝。
这些是辅助代码与历史统计复核，没有重新计时、执行性能矩阵或把旧脚本 hash 改成新 hash。

## 重跑准备与留存

helper 依赖形成时受控布局，不是 package API 或维护中的 benchmark CLI。`summarize.mjs` 当时从 `raw/formal/` 读取；
正式归档已将这些观测平铺到 `raw/`。重跑或复算须在新的自有 tmp 目录准备相同布局，保留新输出，不能直接覆盖报告资源。

完整 before/candidate 源码快照当时位于 `tmp/optimization-20261012/run-projection/{before,candidate}`。
后因 Bun 测试发现污染，被无覆盖移动到同 owner 的 `node_modules/{before,candidate}`；722 文件内容及 807 成员的模式/身份已核对。
历史 shell/manifest 保存旧路径；新的运行前须显式绑定所需快照、确认 runtime 和源码/input hash，并取得计时窗口授权。

临时完整快照和此次审查探针仍保留供核对。后续清理需先确认正式证据足以恢复必要事实及精确删除授权，本次不执行清理。
