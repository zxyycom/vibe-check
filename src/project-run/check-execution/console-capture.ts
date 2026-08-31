import { AsyncLocalStorage } from "node:async_hooks";
import { Console } from "node:console";
import { Writable } from "node:stream";
import { formatWithOptions } from "node:util";

import type { CheckMessage, CheckMessageLevel } from "../../check/check.ts";

type ConsoleInvocation<Result> = Readonly<
  | {
      readonly kind: "returned";
      readonly output: Result;
      readonly messages: readonly CheckMessage[];
    }
  | {
      readonly kind: "threw";
      readonly error: unknown;
      readonly messages: readonly CheckMessage[];
    }
>;

type ConsoleStream = "stderr" | "stdout";

interface ActiveConsoleCall {
  readonly chunks: Array<Readonly<{ readonly stream: ConsoleStream; readonly text: string }>>;
  readonly method: string;
}

interface InstalledConsoleMethod {
  readonly descriptor: PropertyDescriptor | undefined;
  readonly method: string;
}

const HOST_CONSOLE = globalThis.console;
const captureContext = new AsyncLocalStorage<CheckConsoleCapture>();
let activeRouterOwnerCount = 0;
let installedMethods: readonly InstalledConsoleMethod[] = Object.freeze([]);

/** Installs one shared router around the complete resolved-Check execution lifecycle. */
export async function runWithCheckConsoleRouter<Result>(
  operation: () => Result | Promise<Result>
): Promise<Result> {
  const release = acquireConsoleRouter();
  try {
    return await operation();
  } finally {
    release();
  }
}

/**
 * Runs one author-owned Check function in an isolated console capture context. Concurrent contexts
 * keep separate buffers; the resolved-Check lifecycle owns router installation and restoration.
 */
export async function invokeWithCapturedConsole<Result>(
  operation: () => Result | Promise<Result>
): Promise<ConsoleInvocation<Result>> {
  const capture = new CheckConsoleCapture();
  return captureContext.run(capture, async () => {
    try {
      const output = await operation();
      return Object.freeze({ kind: "returned", messages: capture.snapshot(), output });
    } catch (error) {
      return Object.freeze({ kind: "threw", error, messages: capture.snapshot() });
    }
  });
}

class CheckConsoleCapture {
  readonly #console: Console;
  readonly #messages: CheckMessage[] = [];
  #activeCall: ActiveConsoleCall | undefined;

  public constructor() {
    this.#console = new Console({
      colorMode: false,
      ignoreErrors: true,
      stderr: this.#writer("stderr"),
      stdout: this.#writer("stdout")
    });
  }

  public invoke(method: string, arguments_: readonly unknown[]): void {
    const activeCall: ActiveConsoleCall = { chunks: [], method };
    const previousCall = this.#activeCall;
    this.#activeCall = activeCall;
    try {
      const captureMethod: unknown = Reflect.get(this.#console, method);
      if (typeof captureMethod === "function") {
        Reflect.apply(captureMethod, this.#console, arguments_);
      } else {
        activeCall.chunks.push({
          stream: streamForMethod(method),
          text: fallbackConsoleText(method, arguments_)
        });
      }
    } catch {
      activeCall.chunks.push({
        stream: "stderr",
        text: `console.${method} output could not be formatted safely`
      });
    } finally {
      this.#activeCall = previousCall;
      this.#appendCall(activeCall);
    }
  }

  public snapshot(): readonly CheckMessage[] {
    return this.#messages.length === 0 ? Object.freeze([]) : Object.freeze([...this.#messages]);
  }

  #appendCall(call: ActiveConsoleCall): void {
    const chunks = combineAdjacentChunks(call.chunks);
    for (const chunk of chunks) {
      this.#messages.push(
        Object.freeze({
          code: consoleMessageCode(call.method),
          level: levelForConsoleCall(call.method, chunk.stream),
          message: removeTerminalLineEnding(chunk.text)
        })
      );
    }
  }

  #writer(stream: ConsoleStream): Writable {
    return new Writable({
      write: (
        chunk: unknown,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
      ) => {
        const activeCall = this.#activeCall;
        if (activeCall !== undefined) {
          activeCall.chunks.push({ stream, text: String(chunk) });
        }
        callback();
      }
    });
  }
}

function acquireConsoleRouter(): () => void {
  if (activeRouterOwnerCount === 0) installConsoleRouter();
  activeRouterOwnerCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeRouterOwnerCount -= 1;
    if (activeRouterOwnerCount === 0) restoreConsoleRouter();
  };
}

function installConsoleRouter(): void {
  const installed: InstalledConsoleMethod[] = [];
  try {
    for (const method of consoleMethodNames(HOST_CONSOLE)) {
      const original: unknown = Reflect.get(HOST_CONSOLE, method);
      if (typeof original !== "function") continue;
      const descriptor = Object.getOwnPropertyDescriptor(HOST_CONSOLE, method);
      const routed = function (this: Console, ...arguments_: unknown[]): unknown {
        const capture = captureContext.getStore();
        if (capture !== undefined) {
          capture.invoke(method, arguments_);
          return undefined;
        }
        return Reflect.apply(original, HOST_CONSOLE, arguments_);
      };
      Object.defineProperty(HOST_CONSOLE, method, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? false,
        value: routed,
        writable: true
      });
      installed.push(Object.freeze({ descriptor, method }));
    }
    installedMethods = Object.freeze(installed);
  } catch (error) {
    restoreInstalledMethods(installed);
    throw error;
  }
}

function restoreConsoleRouter(): void {
  restoreInstalledMethods(installedMethods);
  installedMethods = Object.freeze([]);
}

function restoreInstalledMethods(methods: readonly InstalledConsoleMethod[]): void {
  for (const { descriptor, method } of [...methods].reverse()) {
    if (descriptor === undefined) {
      Reflect.deleteProperty(HOST_CONSOLE, method);
    } else {
      Object.defineProperty(HOST_CONSOLE, method, descriptor);
    }
  }
}

function consoleMethodNames(value: Console): readonly string[] {
  const names = new Set<string>();
  let current: object | null = value;
  while (current !== null && current !== Object.prototype) {
    for (const key of Reflect.ownKeys(current)) {
      if (typeof key === "string" && key !== "Console" && key !== "constructor") names.add(key);
    }
    current = Reflect.getPrototypeOf(current);
  }
  return Object.freeze(
    [...names].filter((name) => typeof Reflect.get(value, name) === "function").sort(compareText)
  );
}

function combineAdjacentChunks(
  chunks: readonly Readonly<{ readonly stream: ConsoleStream; readonly text: string }>[]
): readonly Readonly<{ readonly stream: ConsoleStream; readonly text: string }>[] {
  const combined: Array<{ stream: ConsoleStream; text: string }> = [];
  for (const chunk of chunks) {
    const previous = combined.at(-1);
    if (previous?.stream === chunk.stream) {
      previous.text += chunk.text;
    } else {
      combined.push({ stream: chunk.stream, text: chunk.text });
    }
  }
  return combined;
}

function fallbackConsoleText(method: string, arguments_: readonly unknown[]): string {
  const formatted = formatWithOptions({ colors: false }, ...arguments_);
  return formatted.length === 0 ? `console.${method}()` : formatted;
}

function consoleMessageCode(method: string): string {
  const normalized = method
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll(/[^a-zA-Z0-9-]/g, "-")
    .toLowerCase();
  return `console-${normalized}`;
}

function levelForConsoleCall(method: string, stream: ConsoleStream): CheckMessageLevel {
  if (method === "warn") return "warning";
  if (method === "assert" || method === "error" || method === "trace") return "error";
  return stream === "stderr" ? "error" : "info";
}

function streamForMethod(method: string): ConsoleStream {
  return method === "assert" || method === "error" || method === "trace" || method === "warn"
    ? "stderr"
    : "stdout";
}

function removeTerminalLineEnding(text: string): string {
  if (text.endsWith("\r\n") && text.length > 2) return text.slice(0, -2);
  if (text.endsWith("\n") && text.length > 1) return text.slice(0, -1);
  return text;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
