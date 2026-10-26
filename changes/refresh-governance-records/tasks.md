# Tasks

保留前阶段已完成的知识治理交付事实；新增 AI-ready 复核从机械基线开始，逐条语义审阅与编辑、独立反查和最终验收完成后交付，Change 留待用户后续处理。

## Readiness

- [x] 0.1 核对项目知识维护规则、Change 契约、分支/HEAD/工作区及现有 Change；确认起始 clean 且本专项无既有 Change。
- [x] 0.2 运行 Decision 与 Investigation 全量 check，并从派生索引建立全量 ID/path/status、标签、关系、资源引用机械基线；明确不代表语义审阅。
- [x] 0.3 协调并确认各并行审阅分区所有权、记录覆盖和高风险升级边界；当前协调入口已更新，三个审阅切面已派发。
- [x] 0.4 复核前阶段 ledger 504 项与当前正式索引的 ID、路径、适用状态及终态 hash；建立本轮只读元数据、机械信号和 active/archive/investigation 分区 manifest。
- [x] 0.5 读取 AI-ready skill/principles 与正文 owner；确认五维逐条判断、信号只筛选注意力及历史记录形成时边界（见阶段二审查报告）。

## Implementation

- [x] 1.1 全量语义审阅并按需维护 127 项 active Decision 的 tags、直接关系、正文与适用边界。
- [x] 1.2 全量语义审阅并按需维护 250 项 archived Decision 的 tags、直接关系、正文与历史边界。
- [x] 1.3 全量语义审阅并按需维护 126 项 Investigation 的 tags、直接关系、正文与历史认识边界。
- [x] 1.4 汇总标签规范化与真实直接关系维护，按专用事务入口更新权威记录及派生索引。
- [x] 1.5 由非实施审阅者独立核查前阶段语义维护结论、记录覆盖和高风险边界。
- [x] 1.6 按用户明确批准保留八项 Skill 的方向，为 test-design 独立设计职责建立对 `260812-keep-seven-distinct-project-skills` 的修订后继；经候选独立审查与 root 确认完整 ID/alignment 后，通过 `publish` 建立后继并归档该精确前序，不改 Skills 安装/代码或其它记录。
- [x] 1.7 完成504项五维逐条复核；132项按证据编辑（61语义/标题、71纯空行），372项字节未改；历史调查形成时边界保留（见 phase-two/ledger.json）。
- [x] 1.8 持久化阶段二summary、504项ledger、合并patch及review/coverage/final-verification；更新proposal/design/tasks；保留第一阶段ledger和review evidence快照。

## Verification

- [x] 2.1 汇总前阶段 ID/path/status 覆盖、标签与关系候选处置、资源引用及各分区审阅证据。
- [x] 2.2 运行前阶段 decisions check、investigations、validate、test-evidence check --root .、change-plan check/check-all 与 git diff --check；记录未运行项及影响。
- [x] 2.3 非实施者独立复核504项覆盖与阶段diff：61完整语义/正文、71纯空行等价、372未改字节等价；R1/R2/R3 closed，open findings为0；边界见phase-two/review/coverage.json。
- [x] 2.4 fresh终验通过：Decision/Investigation、validate、test-evidence、Change check/check-all、git diff --check及新增文本whitespace均exit 0；504身份/路径/metadata/hash闭合，974 resource-owner tree无变化（证据见 phase-two/validation/final-check/）。
- [x] 2.5 完成证据交付与任务收敛；必要commit由root按授权保存，实际提交与推送结果以Git记录和任务交付为准；不主动额外push、允许既有hook推送，不finalize/delete Change。
