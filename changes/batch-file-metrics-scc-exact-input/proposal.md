# Proposal

本 Draft 为 `fileMetrics` 的 SCC adapter 增加有界分批传输与完整结果汇合，使大型 exact-path 集合不再因 Windows process argv 上限而无法测量。

## Why

代码拆分后，一次 repository-quality `fileMetrics` 扫描约选择 620 个文件，并把约 34,941 个字符的精确路径参数一次性交给 SCC；Windows process command line 上限使子进程在形成可信 measurement 前失败。SCC 4.0.0 支持多个文件或目录，却没有可用的 response-file、stdin file-list 或位置 glob 协议；改传目录会让 scanner 重新发现文件并破坏现有 exact-input ownership。

SCC owner 的 transport 是直接修复边界；现有 area selection、逐文件 measurement 和 Record conversion 继续有效。修复需要把“一个逻辑 exact-input measurement”与“一个 OS process invocation”分开，同时保证分批只改变私有传输方式，不产生部分可信结果，也不扩大 public scanner surface。

## Outcome

`fileMetrics` 对单个路径可安全传输、但完整 argv 超出平台边界的 approved exact-path union 使用一个逻辑 measurement：未超过安全 command-line 预算时保持单次 SCC measurement invocation，超过时由 SCC adapter 稳定分批传输，并只在全部批次成功、逐批 scope 合法且汇合结果完整可信后返回统一结果。任一批失败会使整个 Check 沿现有 unavailable taxonomy fail closed，不发布部分 metrics、Findings 或 Records；Windows 大型仓库不再因全部路径集中于一次 argv 而失败。
