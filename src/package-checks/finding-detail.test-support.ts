import type { CheckMessage, CheckMessageLevel } from "../check/check.ts";

export function findingDetail(level: CheckMessageLevel, message: string): CheckMessage {
  return { code: "finding-detail", level, message };
}
