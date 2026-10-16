# Scheduler B 采用与完整 before/after 证据

## 结论与身份

采用 B typed source facts/memberships/current-transaction delta、ready→static head/layer 传播、按需求增量 queue cohorts、精确累计与惰性 local prefixes，以及 query-local native Heap。依据是重复传播实际减少、完整语义/数值证明与大规模真实 Run 收益；**不是所有 Core 操作更快或更省内存**。A 仅隔离传播收益，不是交付替代模型。

- before：main `d4dc896c01a373cf9c3e9709d744a86202373f18`，src digest `7aaca1df0426a2a6aafc1493c62f7e7affaaf6c0a7d67884067502b4c4cc8663`。
- after：同一 HEAD 上的最终工作树，src digest `c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629`；开始/结束完全一致，11 个冻结资源哈希未变。
- Node 24.18.0 / Bun 1.3.14，同工作区/宿主串行独占；warm-up 后7次采样，GC在计时外。Node allocation 单独1次 inspector采样（4096B间隔），其 elapsed 不作为加速证据。宿主补充信息为后续实采，不冒称 before 当时的内存现场。
- Core各120、publicRun/shell各54、scope各6、queried-fork各12个cohort均完成，未删困难场景。含384个计时cohort、120个allocation cohort；全504行的每项 median/min/max、原始内存及24组操作对照见 `comparison-all-cohorts-v1.json`，原始9+9份结果另保留。
- 本人运行 source-level API，不等于 installed artifact。root在计时前的fresh Gate为43/43，candidate `0.0.0-local.45845dd3dad8`，包括隔离安装后的 runtime/docs/types；receipt见本轮验证记录。之后无人写Product，完整性见 `after-completion-check.json`。

## 实际收益与代价

以下单位ms，均为p50；不是均值，也不把Node和Bun相互作基线。全部输入/重复与范围在机器对照中。

| N=2048，before → after | Node | Bun |
| --- | --- | --- |
| wide public static/no observer | 247.72 → 249.09 | 239.41 → 219.70 |
| heterogeneous public static/no observer | 756.83 → 344.80 | 1908.80 → 574.25 |
| wide custom minimal | 1468.72 → 1234.84 | 4533.41 → 4017.12 |
| heterogeneous custom full | 9755.57 → 5650.48 | 39173.20 → 22139.65 |
| wide diagnostics（真实文件写入） | 19594.72 → 12653.48 | 42942.02 → 22019.27 |
| wide cumulative | 2879.77 → 1189.05 | 9819.48 → 4215.92 |
| wide terminal runMeasurement | 1802.38 → 250.06 | 5290.01 → 342.77 |
| wide terminal taskTimings | 2472.63 → 223.16 | 6042.94 → 342.79 |
| heterogeneous terminal taskTimings | 2943.23 → 389.92 | 10187.62 → 614.14 |
| heterogeneous mixed | 11592.22 → 5598.05 | 39820.82 → 21429.89 |
| Core blocked-prefix，64次查询 | 74.73 → 27.63 | 277.62 → 81.57 |

规模趋势并非只选大图：wide terminal taskTimings在N16/256/2048的Node为4.00→3.35、116.99→35.66、2472.63→223.16；Bun为3.24→2.96、82.56→29.39、6042.94→342.79。Node publicRun/shell N16的18项中10快8慢，N256为16快2慢，N2048为17快1慢；Bun分别10/8、15/3、17/1。快慢仅指本次median大小，不等于显著性结论。

**未改善边界全部保留：** Core Node各规模120项中58快62慢；Bun23快97慢。N2048宽图transition Node20.96→23.95、Bun29.74→42.23；fanout transition Node19.57→39.63、Bun31.16→63.60。Bun G=N完整输出19.99→24.83、scope完整输出24.42→35.65。全量fork保留也有明显代价：Bun fanout31.72→74.25，Node blocked-prefix25.45→40.77。typed事务事实/不可变delta与精确表示不是免费维护，不能由更少lookup推断更少总分配。

中规模公开例外没有被隐藏：Node heterogeneous mixed N256为208.62→247.73（before185.82–238.71，after194.27–269.19）；同图shell21.54→49.35（20.41–26.60、20.33–82.07），后者离散明显。Node N2048 wide static增加1.37ms；Bun wide shell增加8.80ms。多数小图回退为亚毫秒；这些数字不用于断言通用增长率或所有输入更快。

## 物理表示、排序与内存采用判断

- 唯一status membership支持count，显式scope lifecycle支持活动查询；去掉重复running/remaining scalar、active Set和无消费者compiled lookups。ready/static仍有两tie与三层有序义务；scope有序slots用于min cap/枚举，不能机械合成一个无序Set。
- N2048 wide transition的before/A/B实际instrumented relation.has为12287/8191/6143，ready Map.get为15017/15017/4096，group-slot读取10921/10921/3413。B的scope正常轨迹移除重复active Set及256次sort。A trace逐字节等于before；instrumenter代理只计指定操作，不计全部对象/分配/CPU。
- Node allocation采样显示wide transition36.66→40.91MB、deep36.98→46.09MB；metadata有真实分配代价。blocked-prefix查询133.68→32.71MB（约75.5%下降）才是native traversal的直接物理依据。单次采样不是精确allocation总量，profile耗时不混入计时。
- 保留不可变persistent backing，不引入dense/bitset/通用tag框架。query-local Mnemonist Heap只暂存所需前缀节点引用，首head可返回时不构造heap；保留revision、两tie、三层与旧fork。合法root ESM导入本身始终eager，不能说仅blocked用户支付加载成本。
- 历史独占query对照Node71.49→34.46、Bun366.37→140.89ms及allocation127.03→32.78MB支持这一局部选择。冷模块import探针（不是全Product startup）Node22.26→62.27ms、Bun9.34→32.86ms，Node post-GC heap约+1.18MB；此成本在计时span外，**没有混算public Run收益**。lazy require路径因加载政策不采用，不改checker、不保留旁路。
- Weak membership排序memo只在真实有序读取时建立；retained查询有成本。Node64个N2048 queried forks：wide4.02→5.70MB、G=N6.93→8.62MB；对应无query为4.01→4.11、6.89→6.99MB。保留memo以复用同membership的反复边缘读取，接受实际保留分支额外数组，不声称免费或全面优于每次排序。
- Node保留全部4096个effect states：wide13.97→16.43MB、G=N21.70→25.71、deep14.87→18.84MB。256个活跃scope轨迹无保留45.82→40.63ms、保留43.05→48.80ms；后者Node retained19.18→22.07MB。Bun同scope无保留76.29→75.29、保留76.08→69.53ms。
- 进程maxRSS：Core Node262764→260032KiB、Bun129664→143016；publicRun Node416776→438028、Bun286796→286816。RSS是进程累计高水位，不是单cohort峰值或索引独占大小。Bun heapUsed大量0/负变化，不能据此宣称无retained成本；原始signed数值完整保留。

## 数值、正确性与复现边界

`numeric/accuracy-proof.md` 原字节作为**形成时冻结候选证明**保留：独立非负直接累计基准、每个局部结果误差界、exact binary表示/最终ties-even舍入、local prefix精确相减、quantum缩放与availability检查点。最终采用BigInt精确贡献+Run-local quantum，无新公开精度，也不把私有prefix超限当交付字段失效。稳定不变量仍以Scheduler owner为准，该原稿不是新规范；相邻独立exact/classifier/trace oracle及stage复核提供执行证据。

两项旧Bug不计作性能或舍入收益：未满足prerequisite seed曾被错误计viable，以及取消链stale forced曾二次结算并使shell抛错，分别由两个 `261016-correct-scheduler-*` Investigation保存最小现场、改后回归与独立根因。正常action/rejection/effect、资源原子性、两tie、fork与终态交付均保持。最终replay oracle37边界+retained forks PASS；它不是历史中间树重建。

所有before/after非publicRun语义checksum相同，源码起止/冻结runner哈希已核对；publicRun runner每次强制completed，计时测真实collector boundary+capture与所声明完整输出，不只测O(1) performanceState wrapper。共96+96诊断日志分别4,372,522,050/4,372,529,794 bytes，成功后在计时外按原策略精确manifest删除；没有唯一失败日志需保留。

复现读 `evidence-reproduction-v2.md` 与精确manifest。原persistent查询文件精确匹配历史hash；最终replay因私有helper收敛而内联原liveness，并将两算法capacity调用重绑最终owner。其新结果不替换旧raw、不宣称只改imports/export-name。主五runner与11冻结资源原字节不变。

7次顺序采样受GC/JIT、宿主与序列继承影响，min/max不是置信区间；例如Node fanout transition的after23.95–46.75ms、Bun fanout retained58.99–124.98ms，离散不能被平均掉。本轮未做跨机器、每一内部段的精确分配普查，未证明一般化最坏时间、所有形状更快或保留内存下降。若需求/表示/host或热路径改变，应保留这些相同cohort重新核对；不靠删场景、放宽误差界或Gate例外完成采用。
