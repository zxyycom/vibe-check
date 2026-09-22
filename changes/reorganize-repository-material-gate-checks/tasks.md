# Tasks

先完成 owner 与输入审计，再实施材料 Check 重组，最后闭合文档和测试证据。

## Readiness

- [ ] 0.1 审计当前 validator、Gate adapter、machine consumer、性能记录、Case ledger 和 owner 文档，冻结 `materials-*` identity 清单。
- [ ] 0.2 用真实 corpus 测量公共 JSON/JSON Schema Check 的文件范围、字节上限、Finding 差异和不可用边界。
- [x] 0.3 确认 package API projection 的 owner、Gate 范围、schema/example registry 和材料 mutex 读写者。
- [ ] 0.4 审阅当前 Project Gate preset Decision；在实际采用 `materials` 后，为新长期语义形成 successor Decision 或完成原记录的合法演进。

## Implementation

- [ ] 1.1 将 validation owner、workspace 命令、task contract、diagnostics 和测试路径统一为 `repository-material` / `materials`。
- [ ] 1.2 按 readiness 清单拆分材料 validator 与 Gate adapter；公共 JSON Checks 使用 constructor，项目专用校验保留最小责任。
- [ ] 1.3 更新 Gate preset、Check identity、focused command、mutex、definition/catalog 和相关测试。
- [ ] 1.4 同步当前 owner 文档、导航、workspace 示例、Test Evidence Case 和 package acceptance 说明。

## Verification

- [ ] 2.1 运行材料 validator、Gate adapter、definition 和 focused selection 的目标测试。
- [ ] 2.2 运行 `bun run test-evidence -- check --root .`，确认移动、拆分和重命名后的 Case 闭合。
- [ ] 2.3 运行 `bun run validate -- materials`、各材料 task、`bun run decisions -- check`、`bun run change-plan -- check-all changes` 和 `git diff --check`。
- [ ] 2.4 运行 `bun run check` 与材料 focused Gate，确认 Check identity、Finding、aggregate 和输出在项目中生效。
