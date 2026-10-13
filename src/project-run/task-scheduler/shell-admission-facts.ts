/** Optional Run-local execution facts; no clock, delay, chronology or second settlement ledger. */
export class ShellAdmissionFacts {
  readonly #taskIds: string[] = [];

  /** Called by the execution owner only after a successful pending-to-running start. */
  recordAdmission(taskId: string): void {
    this.#taskIds.push(taskId);
  }

  get admittedCount(): number {
    return this.#taskIds.length;
  }

  admittedTaskIds(): readonly string[] {
    return Object.freeze([...this.#taskIds]);
  }
}
