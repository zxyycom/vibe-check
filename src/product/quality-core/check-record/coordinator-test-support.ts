import type { ResolvedCheckCatalog } from "./catalog.ts";
import { coordinateCheckRecords } from "./coordinator.ts";
import type { FinalCoreSnapshot } from "./model.ts";

const TEST_SCHEDULER_POLICY = Object.freeze({ maxParallel: 4 });

export function coordinateCheckRecordsWithTestPolicy(
  catalog: ResolvedCheckCatalog
): Promise<FinalCoreSnapshot> {
  return coordinateCheckRecords(catalog, { schedulerPolicy: TEST_SCHEDULER_POLICY });
}
