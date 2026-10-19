/**
 * 已配置的 project change preparation 产生的 Git 文件证据。
 * 按 `ok` 分支判断证据是否可用；失败时全部声明的 change flags 保守地参与选择，Check 获选本身不证明 Git 命中。
 * @see [按文件变化选择 Check](../../docs/api-mechanics.md#按文件变化选择-check)
 */
export type ProjectChanges = Readonly<
  | {
      readonly ok: true;
      /** 命中至少一个 region 的 changed paths；可信零命中时为空。 */
      readonly files: readonly Readonly<{
        /** 相对有效 project root、使用 `/` 分隔的文件路径。 */
        readonly path: string;
        /** 此路径命中的完整 `vibe-check:change:<id>` tokens。 */
        readonly flags: readonly string[];
      }>[];
    }
  | {
      readonly ok: false;
      readonly reason: Readonly<{ readonly code: string }>;
    }
>;
