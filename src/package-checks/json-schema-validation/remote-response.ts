export async function readBoundedResponse(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal
): Promise<Uint8Array | "too-large"> {
  if (declaredResponseIsTooLarge(response, maximumBytes)) return "too-large";
  const reader = response.body?.getReader();
  if (reader === undefined) return new Uint8Array();

  const chunks = await readResponseChunks(reader, maximumBytes, signal);
  return chunks === "too-large" ? chunks : assembleResponseBytes(chunks);
}

function declaredResponseIsTooLarge(response: Response, maximumBytes: number): boolean {
  const length = response.headers.get("content-length");
  return length !== null && /^\d+$/u.test(length) && Number(length) > maximumBytes;
}

async function readResponseChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maximumBytes: number,
  signal: AbortSignal
): Promise<readonly Uint8Array[] | "too-large"> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw transportFailure();
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maximumBytes) {
        await cancelRejectedReader(reader);
        return "too-large";
      }
      chunks.push(chunk.value);
    }
    return chunks;
  } catch {
    throw transportFailure();
  } finally {
    reader.releaseLock();
  }
}

async function cancelRejectedReader(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // The bounded response has already been rejected; cancellation detail is not a transport fact.
  }
}

function assembleResponseBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const responseBytes = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  );
  let offset = 0;
  for (const chunk of chunks) {
    responseBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return responseBytes;
}

function transportFailure(): Error {
  return new Error("remote response transport failed");
}

export function normalizeRemoteReference(referenceUri: string): string {
  const url = new URL(referenceUri);
  if (
    url.protocol !== "https:" ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new TypeError("unapproved remote reference");
  }
  return url.href;
}
