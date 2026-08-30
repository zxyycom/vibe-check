# Tasks

任务先收敛 consumer output owner，再接入 package material lifecycle并验证安装结果。

## Readiness

- [x] 0.1 恢复 machine v4、package documentation、artifact/candidate、testing 与 Decision owners，并确认 current material exact inventory。
- [x] 0.2 确认 Markdown documents 与 TypeScript/JSON/NDJSON resources 需要分层校验，且不新增 artifact reader 或历史材料。

## Implementation

- [x] 1.1 重构 output guide的 consumer阅读主线并从 README直接链接。
- [x] 1.2 建立唯一 mixed-outcomes Definition/output resource registry，并接入 documentation link/material collection。
- [x] 1.3 让生成器从同一份 Definition 形成 Check/Record facts，并让 installed consumer typecheck 直接覆盖该 Definition。
- [x] 1.4 接入 artifact fingerprint、staging、tarball、receipt、install 与 external consumer 逐字节验收。
- [x] 1.5 更新 package/documentation tests 和 Semantic Case proof。
- [x] 1.6 将唯一示例扩展为内置 Check 与自定义依赖工作流，并让生成器通过完整 public Run 形成代表性 facts。

## Verification

- [x] 2.1 运行 output material、package docs、artifact与candidate目标测试。
- [x] 2.2 运行 docs/schema/examples、Test Evidence、Decision与Change checks。
- [x] 2.3 重建 exact candidate并通过 full package verification，核对 installed material inventory。
- [x] 2.4 复核丰富示例的文档映射、installed execution、Test Evidence、Decision 与 Change 状态。
