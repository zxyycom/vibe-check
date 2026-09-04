import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLizardUpstream,
  LIZARD_RELEASE_API_URL,
  LIZARD_RELEASE_MAX_BYTES
} from "./lizard-upstream-advisory.ts";

test("Lizard upstream advisory reports the pinned 1.24 baseline as current without ambient credentials", async () => {
  let request: RequestInit | undefined;
  const result = await checkLizardUpstream({
    fetch: async (_input, init) => {
      request = init;
      return jsonResponse({ tag_name: "v1.24.0" });
    }
  });

  assert.deepEqual(result, {
    baselineVersion: "1.24.0",
    code: "lizard-upstream-no-update",
    kind: "no-update",
    latestVersion: "1.24.0"
  });
  assert.equal(
    LIZARD_RELEASE_API_URL,
    "https://api.github.com/repos/terryyin/lizard/releases/latest"
  );
  assert.equal(new URL(LIZARD_RELEASE_API_URL).protocol, "https:");
  assert.equal(request?.credentials, "omit");
  assert.equal(request?.redirect, "error");
  assert.equal(new Headers(request?.headers).get("authorization"), null);
  assert.equal(new Headers(request?.headers).get("cookie"), null);
});

test("Lizard upstream advisory reports a stable newer release without changing anything", async () => {
  const result = await checkLizardUpstream({
    fetch: async () => jsonResponse({ tag_name: "1.25.0" })
  });

  assert.deepEqual(result, {
    baselineVersion: "1.24.0",
    code: "lizard-upstream-update-available",
    kind: "update-available",
    latestVersion: "1.25.0"
  });
});

test("Lizard upstream advisory keeps HTTP, malformed, and oversized responses advisory", async () => {
  const http = await checkLizardUpstream({
    fetch: async () => new Response(null, { status: 503 })
  });
  const malformed = await checkLizardUpstream({
    fetch: async () => jsonResponse({ tag_name: "latest" })
  });
  const oversized = await checkLizardUpstream({
    fetch: async () => new Response("x".repeat(LIZARD_RELEASE_MAX_BYTES + 1))
  });

  assert.equal(http.code, "lizard-upstream-http-error");
  assert.equal(malformed.code, "lizard-upstream-response-invalid");
  assert.equal(oversized.code, "lizard-upstream-response-too-large");
  assert.equal(http.kind, "unavailable");
  assert.equal(malformed.kind, "unavailable");
  assert.equal(oversized.kind, "unavailable");
});

test("Lizard upstream advisory maps timeout and network failures to stable advisory results", async () => {
  const timeout = await checkLizardUpstream({
    fetch: async (_input, init) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    timeoutMs: 1
  });
  const network = await checkLizardUpstream({
    fetch: async () => Promise.reject(new Error("offline"))
  });
  const bodyReadFailure = await checkLizardUpstream({
    fetch: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error("response body failed"));
          }
        })
      )
  });
  const cancellation = new AbortController();
  cancellation.abort();
  const cancelled = await checkLizardUpstream({
    fetch: async () => {
      throw new Error("cancelled lookup must not start");
    },
    signal: cancellation.signal
  });

  assert.equal(timeout.code, "lizard-upstream-timeout");
  assert.equal(network.code, "lizard-upstream-network-error");
  assert.equal(bodyReadFailure.code, "lizard-upstream-network-error");
  assert.equal(cancelled.code, "lizard-upstream-cancelled");
  assert.equal(timeout.kind, "unavailable");
  assert.equal(network.kind, "unavailable");
  assert.equal(bodyReadFailure.kind, "unavailable");
  assert.equal(cancelled.kind, "unavailable");
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}
