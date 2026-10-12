# Non-core package-tools 附带调查

本资源逐项覆盖 `src/package-tools/**` 当前14生产模块，独立于Core五root50文件；相同HEAD `21777db37c0284308b8c69eb2cc92ab0b012cd9b`。规则owner为 `docs/development/package-tools.md` 与cache、waiver、learned scheduling、debug公开指南；覆盖状态在 `tools-coverage.json`。工具只使用公开能力这一架构边界不意味着工具没有自己的算法责任。

## T01：learned immutable prediction/score/history tables 缺一次性索引

**证据为静态推导，ranking preparation另有操作计数；没有运行learned真实Run时间基准。**

- `critical-path-ranking.ts:22–64` 用memo DFS计算downstream最大值，每个task得分只计算一次，每条边访问一次，本体应O(T+E)；但`:44`对T项predictions每task用find，T个互异known task合计T(T+1)/2，所以实际有Θ(T²+E)查找部分。操作计数无边T=8/16/32/64时find比较36/136/528/2080，证明不是密图边数必要输出。递归栈O(graph depth)，深链还可能fallback，不称其DFS指数。
- `critical-path-ranking.ts:67–72` criticalPathScoreForTask与`duration-model/prediction.ts:92–97` predictionForTask 都对完整T表线性find。`strategy.ts:191–277`先sort candidates，comparator每次读left/right score，k候选、q比较时O(qT)最坏；常规comparison sort上界q=O(k log k)给O(kTlogk)，逐轮候选宽度kᵢ时累计上界ΣO(kᵢTlogkᵢ)。宽无依赖且maxParallel=1的T次boundary允许O(T³logT)上界，不意味着具体sort/input必达到该比较次数。多score/priority tie时也不消除find成本。最后selected预测/score也重复find一次。
- `duration-model/recording.ts:110–120/156–183`每个valid admission调用predictionForTask，A admissions成本O(AT)，普通每task一次A=T时Θ(T²)累计查找。该调用在terminal recording中，不能误归全部Scheduler内核成本。
- `bounded-history.ts:40–45` history series也是find，`prediction.ts:60/99–104`形成T个预测成本O(TH)查找；H≤4096、sample window W≤32为公开硬上界，不能称history随T无限二次。prediction median O(TlogT)、每series p90 O(WlogW)、history排序O(HlogH)；录制临时merged identities可能先到H+A再裁到H，history persisted界不代表录制所有临时工作恒定。

**触发与通常成本：**只在采用createLearnedCriticalPathStrategy的项目运行，Core static default不使用此工具；正常合法大T、宽ready边界及observer选择事件路径均可到达。小T、少候选或者fallback不会有同样成本，尚无真实占比证据。

**最小方向与约束：**prepared closure内为graph/tasks、predictions、scores建private Map并复用，prediction recording也复用按task查找索引；history按digest建一次Map。排序是否可改min scan需保持tightening/continuation、score→priority→taskID tie和canAdmit语义，不捆绑改ranking。保持public immutable数组DTO、可信callback边界、finite/saturating score、cyclic/missing input failure、静态fallback和terminal observer/recording lifecycle；不用全局cache或新增Core→工具依赖。

## T02：learned selection layers 的scoped membership与重复投影

`selection-layers.ts:18–35`每次boundary重建task/scope Map，O(T+S)，并两次filter候选；`:38–50`每候选线性 `scope.activationTaskIds.includes(taskId)`。若k个候选属于同一inactive scope且activation列表a=k，则membership合计Θ(k²)比较；一般上界O(k·a_max)，累计Σ各boundary。数据中scope/task ownership和真实activation列表由Project Run graph owner提供，本切面没有实跑这种scope真实Run，归**静态条件候选**，不是已测热点。active判定在includes之后也意味着active scope的候选会先付membership成本。

一次prepared graph索引/activation Set可消除稳定DTO重复投影/扫描，仍须每boundary读取activeScopeIds/candidates并保持tightening规则。`static-decision.ts:39–57`只选第一项却排序k项，O(klogk)是可比较的选择算法候选；没有证据证明它是实际瓶颈，不为单个最小值立即增加复杂抽象。

## C05的真实工具消费者（不计第二个候选）

`change-flag-debugging.ts:184–191`传动态regions自有K字段给公开snapshotExactClosedRecord，触发Core C05；归相同owner与根因，不重复编号。其余debug paths是一次batch collection与Core全域索引，最终Map查询，格式化完整files/regions/flags是按输出字节成本；两次区域构建第一遍没有文件，非逐文件重建。

## 其余工具的必要成本与未发现候选

- `finding-waivers/reconciliation.ts:82–125`用canonical identity→index Map，finding/waiver对账不是F×W双循环；工作O(F+W+identity规范化/字符串/哈希成本)，空间O(F+W+identity文本)。先materialize waiver再再次canonicalIdentity只是常数倍，identify是可信caller函数复杂度未知；不建议空waiver时跳过identity校验，契约明确仍验证全部findings。
- `finding-presentation.ts:22–49`有限preview仍复制omittedFindings后传omittedMessage，这是公开callback完整尾部义务，所以O(F)复制，不是由于limit固定就该O(limit)。appendCheckMessages复制本次合并messages，实际Check通常1–2次调用，未发现无界循环使用；调用方反复append可累积二次但非helper内部重复工作。message/omittedMessage可信callback未知。
- `cache-json-by-key.ts:70–103/188–286`hit读完整entry再parse/canonical clone/parser；miss compute→canonical→parser→JSON stringify写entry，按key/payload字节和规范树成本。没有查全cache directory、没有TTL/LRU；同key并发miss可重复compute是公开明确不提供single-flight，不作为缺陷。computed/cached parser复杂度与I/O尺寸由caller拥有，未计时。
- `duration-model/storage.ts:50–73/127–221`全部read/JSON.parse后才series/sample形状验证，H≤4096/W≤32只限制accepted模型，不限制invalid文件本身的bytes及dense shallow snapshot；caller-trusted disposable state，不宣称抗任意大无效文件资源界。write固定当前模型完整canonical envelope，freeze/sort为有界历史及真实内容成本。
- `duration-model/preparation.ts`一次load/predict、保留record闭包；无独立递归/集合算法，成本由上述owner传递。`strategy.ts`identityForTask每T项caller回调和canonical identity成本不能视为常数；observe Promise不await且故障被包含，回调规模/挂起责任是可信caller，未审计其外部实现。
- `admission-policy/define-admission-policy.ts:50–54`运行时原样返回，types约束不是runtime算法；Core独立性不改变这些数据工具属于Non-core的事实。

## 验证边界

完整读取14当前模块，以CodeGraph node与owner契约复核。仅T01 ranking无边查找在共同 `core-foundations-probe.ts`中计数；T01 selection/recording/history和T02未做operation或time测量。未联网/安装、未动prod/tests/Case、未写cache/history、未跑真实scanner或发行验收。优先做T01 prepared表索引的目标workload baseline，不以这里的阶推导直接许诺Gate秒数变化。
