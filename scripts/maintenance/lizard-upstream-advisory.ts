export const LIZARD_BASELINE_VERSION = "1.24.0";
export const LIZARD_RELEASE_API_URL =
  "https://api.github.com/repos/terryyin/lizard/releases/latest";
export const LIZARD_UPSTREAM_TIMEOUT_MS = 5_000;
export const LIZARD_RELEASE_MAX_BYTES = 64 * 1024;

type LizardUpstreamUnavailableCode =
  | "lizard-upstream-cancelled"
  | "lizard-upstream-timeout"
  | "lizard-upstream-network-error"
  | "lizard-upstream-http-error"
  | "lizard-upstream-response-too-large"
  | "lizard-upstream-response-invalid";

export type LizardUpstreamAdvisory =
  | Readonly<{
      readonly kind: "no-update";
      readonly code: "lizard-upstream-no-update";
      readonly baselineVersion: typeof LIZARD_BASELINE_VERSION;
      readonly latestVersion: string;
    }>
  | Readonly<{
      readonly kind: "update-available";
      readonly code: "lizard-upstream-update-available";
      readonly baselineVersion: typeof LIZARD_BASELINE_VERSION;
      readonly latestVersion: string;
    }>
  | Readonly<{
      readonly kind: "unavailable";
      readonly code: LizardUpstreamUnavailableCode;
      readonly baselineVersion: typeof LIZARD_BASELINE_VERSION;
      readonly latestVersion: null;
    }>;

export interface LizardUpstreamAdvisoryOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

type Version = readonly [major: number, minor: number, patch: number];

type ReleaseResponse = Readonly<{ readonly tagName: string }>;

type ResponseReadResult =
  | Readonly<{ readonly kind: "text"; readonly text: string }>
  | Readonly<{ readonly kind: "too-large" }>
  | Readonly<{ readonly kind: "invalid" }>;

/**
 * Explicit maintenance-only release lookup. It never modifies the repository or
 * turns an unavailable network fact into a failing Project Gate result.
 */
export async function checkLizardUpstream(
  options: LizardUpstreamAdvisoryOptions = {}
): Promise<LizardUpstreamAdvisory> {
  const requestSignal = createRequestSignal(
    options.signal,
    options.timeoutMs ?? LIZARD_UPSTREAM_TIMEOUT_MS
  );
  try {
    if (options.signal?.aborted) return unavailable("lizard-upstream-cancelled");

    const response = await (options.fetch ?? globalThis.fetch)(LIZARD_RELEASE_API_URL, {
      cache: "no-store",
      credentials: "omit",
      headers: { accept: "application/vnd.github+json" },
      redirect: "error",
      signal: requestSignal.signal
    });
    if (!response.ok) return unavailable("lizard-upstream-http-error");

    const body = await readResponseBody(response, requestSignal.signal);
    if (body.kind === "too-large") return unavailable("lizard-upstream-response-too-large");
    if (body.kind === "invalid") return unavailable("lizard-upstream-response-invalid");

    const release = parseReleaseResponse(body.text);
    if (!release) return unavailable("lizard-upstream-response-invalid");

    const latestVersion = parseVersion(release.tagName);
    if (!latestVersion) return unavailable("lizard-upstream-response-invalid");

    const latestVersionText = formatVersion(latestVersion);
    return compareVersions(latestVersion, baselineVersion()) > 0
      ? {
          baselineVersion: LIZARD_BASELINE_VERSION,
          code: "lizard-upstream-update-available",
          kind: "update-available",
          latestVersion: latestVersionText
        }
      : {
          baselineVersion: LIZARD_BASELINE_VERSION,
          code: "lizard-upstream-no-update",
          kind: "no-update",
          latestVersion: latestVersionText
        };
  } catch {
    if (requestSignal.timedOut()) return unavailable("lizard-upstream-timeout");
    if (options.signal?.aborted) return unavailable("lizard-upstream-cancelled");
    return unavailable("lizard-upstream-network-error");
  } finally {
    requestSignal.dispose();
  }
}

function unavailable(code: LizardUpstreamUnavailableCode): LizardUpstreamAdvisory {
  return {
    baselineVersion: LIZARD_BASELINE_VERSION,
    code,
    kind: "unavailable",
    latestVersion: null
  };
}

function baselineVersion(): Version {
  const version = parseVersion(LIZARD_BASELINE_VERSION);
  if (!version) throw new Error("Lizard baseline version must be a canonical semantic version");
  return version;
}

function parseReleaseResponse(text: string): ReleaseResponse | null {
  try {
    const parsed: unknown = JSON.parse(text) as unknown;
    if (!isRecord(parsed) || typeof parsed.tag_name !== "string") return null;

    // GitHub's release envelope may add fields. Only this allowlisted field crosses
    // the boundary, then the script uses the closed local ReleaseResponse shape.
    return Object.freeze({ tagName: parsed.tag_name });
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseVersion(value: string): Version | null {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) return null;

  const version = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  return version.every(Number.isSafeInteger) ? version : null;
}

function formatVersion([major, minor, patch]: Version): string {
  return `${major}.${minor}.${patch}`;
}

function compareVersions(left: Version, right: Version): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

async function readResponseBody(
  response: Response,
  signal: AbortSignal
): Promise<ResponseReadResult> {
  const body = response.body;
  if (!body) return { kind: "invalid" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    for (;;) {
      const read = await reader.read();
      if (read.done) break;
      byteLength += read.value.byteLength;
      if (byteLength > LIZARD_RELEASE_MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The oversized response is already rejected; cancellation is best effort.
        }
        return { kind: "too-large" };
      }
      if (signal.aborted) signal.throwIfAborted();
      chunks.push(read.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: "text", text: new TextDecoder().decode(bytes) };
}

function createRequestSignal(
  source: AbortSignal | undefined,
  timeoutMs: number
): Readonly<{
  readonly dispose: () => void;
  readonly signal: AbortSignal;
  readonly timedOut: () => boolean;
}> {
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  const cancelFromSource = () => controller.abort();
  source?.addEventListener("abort", cancelFromSource, { once: true });

  return {
    dispose: () => {
      clearTimeout(timeout);
      source?.removeEventListener("abort", cancelFromSource);
    },
    signal: controller.signal,
    timedOut: () => didTimeout
  };
}

if (import.meta.main) {
  if (process.argv.length !== 2) {
    console.error("usage: bun scripts/maintenance/lizard-upstream-advisory.ts");
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(await checkLizardUpstream()));
  }
}
