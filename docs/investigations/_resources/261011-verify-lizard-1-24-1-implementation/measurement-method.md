# 完整 Check 升级成本的形成条件

本材料保存本轮做法，不是项目性能工具的新入口或产品依赖。正式结论见 owner Investigation。

## 冻结与运行

- baseline：`7ef5c73eaabecf0ad2e270a65ab0a62552429764`；旧 `src` 从实施前工作树复制，之后逐项 hash 校验。
- 输入：`corpus-manifest.json` 的 597 个 `src/**/*.ts`、3,021,891 bytes。输入固定为旧基线内容，不含实施后新增源码或样例；before/after 使用同一独立 corpus。
- runtime：锁定 Node 24.18.0；准备与验证用 Bun 1.3.14。依赖沿用未修改的锁定 workspace installation，无新增依赖、联网或 fetch。
- 配置：public `functionMetrics` → `defineConfig` → `run` → 真实 Worker；exact patterns、关闭默认 excludes；四项 maximum 均为 1，codeLines low-complexity allowance 的 maximum 也为 1。默认 non-blocking，关闭 machine、diagnostic、progress 输出。
- 15 个 deterministic ABBA blocks，每 temperature、每侧 30 样本。cold 统计 Python supervisor 的整个 fresh Node target wall（包括 mise/Node 启动）；warmed-operation 每 fresh target 先做一次未计入同进程 Run，统计第二次 operation wall。cold 不是清空 OS filesystem cache，warm 不是 long-lived warm session。
- 原始样本保留两个 wall 值、side/block/runtime、完整 Check outcome+Records digest。每样本 facts 与相同 side/temperature 的首次完整 facts 深比较；冷、warm facts 也深比较。测前/测后 source 与 corpus hashes 均须相同，否则失败。
- 未测 CPU/RSS，不声称资源改善。不同 Node/主机、默认阈值、Gate 整体、其他语言比例与长期 warm workload 不在结论范围。

## 取证转折

`pre-guard-*` 保存最终绝对 anchor 修正后的首次完整 120 样本，而非早期错误 anchor 的原型。它发现可重复 +3.58% cold / +4.66% warmed 成本；profile 和 28 个变化文件的 exact Python/port 对照用于定位。

`guard-diagnostic-samples.json` 是额外的 analyzer-only 5-block ABBA、每侧 10 样本；同一 597 已解码输入，先 warmup 一次，再计一次 facade traversal。两侧完整 facts digest 相同。它只证明等价 slash-prefix guard 的局部成本价值，不替代最终完整 Check 重采。

最终 `performance-*` 与 `measurement-identity.json` 由 guard 通过独立正确性/规范审核后重新冻结、完整重采产生。首次完整样本没有删除或改写。`output-difference.json` 保存完整 added/removed/changed Records；未变化 Records 不再重复保存，完整两侧 digest 由 raw samples 保存。`changed-source-parity.json` 保存 28 个变化文件两版原始 upstream metrics，本地同版 facade 各字段零差异；它解释本轮真实输入的输出变化，不声称所有可能源码都已覆盖。

## 复核与重跑

脚本保存形成时固定路径，便于恢复实际做法。若需重跑，应先由调用方选择独占、可丢弃的 `/tmp/vibe-lizard-upgrade-20261011`，不要覆盖仍需保留的现场：

1. 从已记录 baseline Git 对象只读取得 `src/`，分别放入 `baseline/src/` 与 `corpus/src/`；baseline 根放 `type: module` package manifest，并解析同一锁定 workspace dependencies。
2. 将 `paths.json` 放到上述临时根，manifest 放到 `evidence/corpus-manifest.json`；将 `product-driver.mjs`、`benchmark.py` 放到临时根。最终被测 workspace 固定为 `/workspace/vibe-check`；重跑其他位置须显式调整脚本路径并记录新条件。
3. 核对全部输入 hashes；确认最终源码不再写入，没有同时运行 build、tests、Gate 等重负载，再用 `mise exec -- uv run --offline --no-project python /tmp/vibe-lizard-upgrade-20261011/benchmark.py`。输出目录必须不存在，脚本拒绝覆盖既有最终证据。
4. `compare-facts.py` 对冷/warm完整 facts 进行复核并派生 Record 差异。报告保留差异与摘要，临时完整 facts 则用于本轮校验。
5. 精确 upstream 对照需调用方提供旧/新固定 commit 的只读 checkout，以及已有 Pygments 2.18 环境；`corpus-upstream-probe.py` 不安装、不修改源码。输入形状为 `{cases:[{filename,sourceCode}]}`，可按 manifest 从冻结 corpus 重建 28 个差异文件；`corpus-port-probe.mjs` 消费同一输入。

此资源记录形成时方法，未来重跑时间值不必相等；输入/来源/runtime/configuration 的漂移须作为新条件解释。
