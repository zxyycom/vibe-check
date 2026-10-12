# 主线程补充验证

测量代理的 `../artifact-sha256.txt` 与 `../artifact-sizes.txt` 保持原样，仅覆盖最终 commit-ready 交付的 44 个文件。
本目录是主线程追加的独立记录，不混入测量代理归档或改变其统计。

- `gate-all-attempt-1.txt`：首轮完整 Gate，42/43；strategy code-lines 阻断原始日志。
- `gate-all-final.txt`：源代码修正后、正式测量快照冻结前的最终完整 Gate，43/43；对应同一最终 source bytes。
- `raw-statistics-audit.txt`：主线程使用 Python 标准库读取全部十份 raw，独立重算 37 行的完整输出相等、批次数、median/MAD/min/max、每进程中位数与五对比率，逐值核对通过。
- `validate-final.txt`、`case-final.txt`、`change-all-final.txt`、`decisions-final.txt`、`format-final.txt`：测量归档与验收文档加入后的实际补验日志。任务 2.4/2.5 只按这些已取得的证据勾选；`change-final.txt` 记录最终 12/13，独立审查仍待完成。
- `artifact-sha256.txt`：只覆盖本目录其它普通文件，清单本身除外。与测量代理清单独立核对。

第一次主线程比较 src manifest 使用了 `./` 前缀，而测量 manifest 为 `src/`；文本比较因此失败。改用相同的 repo-relative 路径重新生成后逐字节相同，SHA 为 `8fe097928bef32df57b87a7414b7f80853acd968048d8229c5de881216478b40`。没有源代码差异或被丢弃的计时样本。

首次暂存后，Git 空白检查拒绝了原始 patch 的上下文空白与 oxlint 原始输出尾空白。测量代理把这 7 个文件无损移入 `../raw-text-evidence.tar.gz`，保存原始 SHA 与路径；主线程再次解包逐字节比较后才替换仓库表示。没有清理原始字节、放宽规则或重测；最终 cached diff 空白检查通过。
