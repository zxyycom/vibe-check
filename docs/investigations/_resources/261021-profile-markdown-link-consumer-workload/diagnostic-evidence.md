# 成本与安全证据节选

来源为 2026-10-21 至 22 日已经完成的隔离实验，本次整理未重新测量。计时样本另见 timing-samples.csv；本附件保留支持判断的计数、局部区间、反例和安全结果，省略完整轨迹与逐函数清单。表内毫秒保留三位小数，中位数由对应完整组计算。

## 工作量与重复匹配

最新 36 个成本 profile（Bun/Node × 两版 × 三深度 × 三次）逐项通过以下计数断言：

| 深度 | containment lstat | 正文 open/fstat/close（各） | 正文 read | worker 请求 |
| --- | ---: | ---: | ---: | ---: |
| 10 | 19840 | 1856 | 3712 | 3840 |
| 30 | 59520 | 1856 | 3712 | 3840 |
| 60 | 119040 | 1856 | 3712 | 3840 |

每 Run 实际返回 3,320,800 bytes，worker 启动/退出各 1、句柄余额 0。fixed/adaptive 的累计工作缓冲申请分别为 1,946,158,912 / 3,322,656 bytes；正常语料均零扩容。计数不含 collection、root realpath 和 cache JSONL。

前次读取/收集的 Bun 单次 profile 中，fast 与 collection-prefix 的物理操作和最终选中文件一致；差异在纯 matcher 工作：

| 深度 | readdir / collection lstat | 逻辑祖先访问 | matcher：fast→prefix | prefix 计算：fast→prefix |
| --- | ---: | ---: | ---: | ---: |
| 10 | 18 / 1842 | 175 | 647780 → 64540 | 18508 → 1844 |
| 30 | 58 / 1882 | 1735 | 2006480 → 65940 | 57328 → 1884 |
| 60 | 118 / 1942 | 7075 | 4202030 → 68040 | 120058 → 1944 |

## 自适应缓冲后的成本

下表每格为三个独立成本 profile 的中位毫秒，不能把不同列的中位数相加当成同一个 Run。worker job 与其 lstat 为嵌套区间。

| Runtime / 深度 | 文件发现 | 源处理 | 引用解析 | 路径 job | 其中 lstat | 正文 job |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bun / 10 | 81.164 | 762.239 | 51.055 | 128.086 | 51.399 | 58.635 |
| Bun / 30 | 142.989 | 944.213 | 70.205 | 286.844 | 175.078 | 59.229 |
| Bun / 60 | 222.362 | 1332.778 | 107.049 | 644.756 | 468.107 | 64.837 |
| Node / 10 | 27.519 | 826.756 | 50.606 | 152.324 | 62.164 | 79.393 |
| Node / 30 | 37.896 | 1012.556 | 75.726 | 339.124 | 193.839 | 83.376 |
| Node / 60 | 55.201 | 1414.427 | 106.340 | 754.097 | 510.479 | 87.095 |

Bun adaptive 深度 60 第一次 profile 的 Run 为 1657.804 ms，具体区间如下。六个父阶段互斥但不穷尽 Run，其余 clocks 为 inclusive：

| 区间 | 毫秒 |
| --- | ---: |
| root / discovery / sources | 0.180 / 221.901 / 1328.296 |
| resolve / candidates / finalize | 101.189 / 0.134 / 2.909 |
| worker 路径 job / 其中 lstat / path.join | 643.559 / 466.838 / 47.490 |
| worker 正文 job / 其中分配 | 64.837 / 3.099 |
| 父线程路径请求 / 正文请求 | 959.567 / 314.980 |
| cache restore / digest | 32.946 / 7.243 |

父线程请求跨度包含启动、传输、调度和 worker job；与 worker 区间的差值不是纯通信 CPU。成本插桩与 CPU sampling 分开取得，均仅用于诊断。

## CPU、缺页与慢样本

以下为 plain 各组中位数；CPU 为进程所有线程累计值，RSS 为约 50 ms 窗内采样峰值。

| runtime / 深度 | CPU ms：fixed→adaptive | minor faults：fixed→adaptive | RSS KiB：fixed→adaptive |
| --- | ---: | ---: | ---: |
| bun / 10 | 1023.044 → 996.956 | 5280.5 → 4834 | 190954 → 190354 |
| bun / 30 | 1308.464 → 1268.866 | 5223.5 → 5231.5 | 191318 → 191580 |
| bun / 60 | 1856.075 → 1741.558 | 7167 → 6972.5 | 190800 → 190704 |
| node / 10 | 1206.037 → 838.774 | 93295 → 7319 | 442048 → 311440 |
| node / 30 | 1986.396 → 1072.110 | 468793.5 → 5736.5 | 336978 → 314178 |
| node / 60 | 2335.787 → 1487.273 | 436478.5 → 4666.5 | 322654 → 313884 |

全部 120 个 plain 样本的 major faults、观察到的共享 cgroup CPU 节流增量、memory max events 和 memory pressure 增量均为零；没有样本超过自身组中位数的 1.5 倍。Linux page size 为 4096 bytes。minor fault 不代表磁盘 I/O，累计 buffer 容量也不是 RSS。

| 自然样本 | 墙钟 ms | CPU ms | minor faults | 已观察线程排队 ms |
| --- | ---: | ---: | ---: | ---: |
| node fixed D10 R3 | 1125.460 | 1354.818 | 175887 | 4.164 |
| node fixed D30 R6 | 1390.893 | 1563.786 | 241008 | 1.719 |
| bun fixed D60 R5 | 1633.953 | 1925.006 | 7290 | 48.965 |
| bun fixed D60 R10 | 1463.626 | 1755.178 | 6672 | 2.478 |

线程增量只覆盖窗内被采样片段，并只保留 CPU 最高的五个线程；cgroup 为共享环境状态。Bun 历史 combined 深度 60 的范围是 1527–3078 ms，六版同一轮均出现慢值（3078–9014 ms）；这些样本保留在 CSV 的 io 阶段。本轮没有重现该尾部。

独立 CPU sampling 对 plain bundle 各跑两次，深度均为 60：

| runtime / 版 / 轮次 | 墙钟 ms |
| --- | ---: |
| bun / fixed / 1 | 1544.662 |
| bun / adaptive / 1 | 1479.756 |
| bun / adaptive / 2 | 1705.642 |
| bun / fixed / 2 | 1702.303 |
| node / fixed / 1 | 1672.581 |
| node / adaptive / 1 | 1339.840 |
| node / adaptive / 2 | 1346.303 |
| node / fixed / 2 | 1401.285 |

16 份 profile 中，12 份与测量窗口相交，4 份是窗前 warmup worker。Bun 仅取得 4 份 main；Node 每 Run 取得 main 与 measured worker，main 覆盖完整窗口、worker 约 95.4%–96.5%。Node fixed 的采样 Run 已偏离其 plain D60 范围 2077.019–2216.657 ms；因此采样百分比只解释诊断运行，不能分解 plain 收益。Bun main 的 postMessage 栈权重也可能承接 native wait，而非通信 CPU 占比。

## 路径安全与取消

最新 12 组（Bun/Node × fixed/adaptive × D10/30/60）全部通过，4×29 个相邻回归也通过。每组均有 24 项路径、16 项读链/worker 故障、19 项既有取消及 16 项共同缓冲场景；adaptive 另有 6 项扩容转移。每版覆盖六个 runtime/深度组合：

| 版 | 通过组数 | worker 启动/退出（每组） | 末尾句柄（每组） |
| --- | ---: | ---: | ---: |
| fixed | 6 | 74 / 74 | 0 |
| adaptive | 6 | 80 / 80 | 0 |

路径场景覆盖越界再入、external policy、40/41 symlink hops、前缀替换、节点固定观察与 final-leaf no-follow。缓冲场景覆盖空/短/1 MiB 边界、真实增长/缩小、短读后继续增长、分配/扩容后失败和取消。结果与旧 combined 的 24 项路径及 16 项读链结果、有序轨迹一致；直接可比轨迹去除了 buffer 事件和 read 请求容量。单独 growthTrace 按独立 bytes/EOF/max+1/容量断言核验，允许 chunk 划分不同。

以下为 Bun adaptive D60 两项实际结果，原样节选；前者在 64-byte 预算下最多读取 65 bytes，后者在扩容后取消且没有部分普通输出：

```json
[
  {
    "name": "fstat-then-grow-bounded-max-plus-one",
    "result": {
      "ok": false,
      "reason": "too-large"
    },
    "returnedBytes": 65,
    "completedReadChunks": [
      2,
      2,
      4,
      8,
      16,
      32,
      1
    ],
    "capacities": [
      2,
      4,
      8,
      16,
      32,
      64,
      65
    ],
    "opened": 1,
    "closed": 1
  },
  {
    "name": "check-source-cancel-after-expansion-no-partial",
    "checked": {
      "records": [],
      "result": {
        "status": "unavailable",
        "reason": {
          "code": "cancelled"
        },
        "messages": [
          {
            "code": "cancelled",
            "level": "error",
            "message": "Markdown link validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      }
    },
    "expanded": true,
    "opened": 1,
    "closed": 1,
    "newOperationsAfterAbort": 0
  }
]
```

取消被观察后停止新操作，仍执行 finally close；已进入的同步 syscall 不可抢占。collection 是同步且无 signal 的 API，取消在收集结束后由 Check 收束。close 错误在真实关闭后注入，worker fault 在 native open 前触发；真实 OS close 失败、在途强杀、Windows 和真实慢/冷存储另待验证。
