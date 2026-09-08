import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const count = Number(process.env.COUNT ?? 1160);
const rounds = Number(process.env.ROUNDS ?? 9);
const root = await fs.mkdtemp(join(tmpdir(), "vibe-cache-stages-"));
const payload = "x".repeat(842);

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
}

async function measure(
  label: string,
  prepare: (round: number) => Promise<string>,
  work: (directory: string, index: number) => Promise<void>
): Promise<void> {
  const allMs: number[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const directory = await prepare(round);
    const started = performance.now();
    for (let index = 0; index < count; index += 1) {
      await work(directory, index);
    }
    const ms = performance.now() - started;
    allMs.push(ms);
    await fs.rm(directory, { recursive: true, force: true });
  }
  console.log(
    JSON.stringify({
      label,
      count,
      rounds,
      allMs,
      medianMs: median(allMs),
      perEntryMedianMs: median(allMs) / count,
      minMs: Math.min(...allMs),
      maxMs: Math.max(...allMs)
    })
  );
}

try {
  await measure(
    "readFile-missing",
    async (round) => {
      const directory = join(root, `read-${round}`);
      await fs.mkdir(directory);
      return directory;
    },
    async (directory, index) => {
      try {
        await fs.readFile(join(directory, `${index}.json`), "utf8");
      } catch (error: unknown) {
        const isNotFound =
          typeof error === "object" &&
          error !== null &&
          (error as { code?: unknown }).code === "ENOENT";
        if (!isNotFound) throw error;
      }
    }
  );
  await measure(
    "mkdir-existing-recursive",
    async (round) => {
      const directory = join(root, `mkdir-${round}`);
      await fs.mkdir(directory);
      return directory;
    },
    async (directory) => {
      await fs.mkdir(directory, { recursive: true });
    }
  );
  await measure(
    "writeFile-exclusive-842B",
    async (round) => {
      const directory = join(root, `write-${round}`);
      await fs.mkdir(directory);
      return directory;
    },
    async (directory, index) => {
      await fs.writeFile(join(directory, `.tmp-${index}`), payload, {
        encoding: "utf8",
        flag: "wx"
      });
    }
  );
  await measure(
    "rename-842B",
    async (round) => {
      const directory = join(root, `rename-${round}`);
      await fs.mkdir(directory);
      for (let index = 0; index < count; index += 1) {
        await fs.writeFile(join(directory, `.tmp-${index}`), payload, { flag: "wx" });
      }
      return directory;
    },
    async (directory, index) => {
      await fs.rename(join(directory, `.tmp-${index}`), join(directory, `${index}.json`));
    }
  );
  await measure(
    "writeFile-plus-rename-842B",
    async (round) => {
      const directory = join(root, `wr-${round}`);
      await fs.mkdir(directory);
      return directory;
    },
    async (directory, index) => {
      const temporaryPath = join(directory, `.tmp-${index}-${randomUUID()}`);
      await fs.writeFile(temporaryPath, payload, { encoding: "utf8", flag: "wx" });
      await fs.rename(temporaryPath, join(directory, `${index}.json`));
    }
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
