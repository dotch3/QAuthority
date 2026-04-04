/**
 * In-memory SSE event bus for live test run progress updates.
 * Listeners are keyed by testRunId. Each listener is a callback
 * that serializes an event and writes it to the SSE response stream.
 */

type Listener = (event: TestRunEvent) => void

export interface TestRunEvent {
  type: "case_updated" | "run_status" | "ci_status" | "ping"
  payload: Record<string, unknown>
}

class TestRunEventBus {
  private listeners = new Map<string, Set<Listener>>()

  subscribe(runId: string, listener: Listener): () => void {
    if (!this.listeners.has(runId)) {
      this.listeners.set(runId, new Set())
    }
    this.listeners.get(runId)!.add(listener)

    return () => {
      const set = this.listeners.get(runId)
      if (set) {
        set.delete(listener)
        if (set.size === 0) this.listeners.delete(runId)
      }
    }
  }

  emit(runId: string, event: TestRunEvent): void {
    const set = this.listeners.get(runId)
    if (!set) return
    for (const listener of set) {
      try {
        listener(event)
      } catch {
        // listener closed — ignore
      }
    }
  }

  listenerCount(runId: string): number {
    return this.listeners.get(runId)?.size ?? 0
  }
}

export const testRunEventBus = new TestRunEventBus()
