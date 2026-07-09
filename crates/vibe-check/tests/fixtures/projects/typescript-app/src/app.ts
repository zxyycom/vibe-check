type Greeting = {
  readonly name: string;
  readonly active: boolean;
};

export const defaultGreeting: Greeting = {
  name: "TypeScript fixture",
  active: true,
};

export function formatGreeting(greeting: Greeting): string {
  const state = greeting.active ? "ready" : "paused";
  return `${greeting.name} is ${state}`;
}
