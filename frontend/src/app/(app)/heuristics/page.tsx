"use client"

import { HeuristicList } from "@/components/heuristics/HeuristicList"

export default function HeuristicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Heuristics</h1>
        <p className="text-muted-foreground mt-1">
          Manage reusable templates and approaches for writing effective ET charters
        </p>
      </div>

      <HeuristicList />
    </div>
  )
}
