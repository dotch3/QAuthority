"use client"

import { useEffect, useRef, useCallback } from "react"

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ??
  "http://localhost:3001/api/v1"

export type RunSSEEventType = "case_updated" | "run_status" | "ci_status" | "ping"

export interface RunSSEEvent {
  type: RunSSEEventType
  payload: Record<string, unknown>
}

type Handler = (event: RunSSEEvent) => void

/**
 * Opens an SSE connection to /test-runs/:runId/events.
 * Automatically reconnects on error with exponential back-off.
 * Cleans up on unmount or when runId changes.
 */
export function useTestRunSSE(runId: string | null | undefined, onEvent: Handler) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const retryDelay = useRef(1000)
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!runId) return
    if (esRef.current) esRef.current.close()

    const url = `${API_BASE}/test-runs/${runId}/events`
    const es = new EventSource(url)
    esRef.current = es

    const handleMessage = (type: RunSSEEventType) => (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        onEventRef.current({ type, payload })
      } catch {
        // ignore malformed
      }
    }

    es.addEventListener("case_updated", handleMessage("case_updated"))
    es.addEventListener("run_status", handleMessage("run_status"))
    es.addEventListener("ci_status", handleMessage("ci_status"))
    es.addEventListener("ping", handleMessage("ping"))

    es.onerror = () => {
      es.close()
      esRef.current = null
      // Exponential back-off capped at 30 s
      setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000)
        connect()
      }, retryDelay.current)
    }

    es.onopen = () => {
      retryDelay.current = 1000
    }
  }, [runId])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [connect])
}
