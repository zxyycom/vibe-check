import type { ProjectChanges } from "./project-changes.ts";

/** 每次 Run 共享、冻结的 caller project context。 */
export interface CheckProjectContext {
  /** 本次 Run 使用的绝对项目根目录。 */
  readonly root: string;
  /** 已去重、排序的 invocation-effective flags（caller flags 与派生 change flags）。 */
  readonly flags: readonly string[];
  /** 只在当前 Project Definition 配置 change preparation 时存在。 */
  readonly changes?: ProjectChanges;
}
