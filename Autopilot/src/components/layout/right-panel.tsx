"use client"
import { Loader2, CheckCircle2, Circle } from "lucide-react"

export function RightPanel() {
  const steps = [
    { label: "Requirements Agent", status: "completed" },
    { label: "Budget Agent", status: "running" },
    { label: "Transport Agent", status: "pending" },
    { label: "Accommodation Agent", status: "pending" },
    { label: "Itinerary Agent", status: "pending" }
  ]

  return (
    <aside className="w-80 border-l border-border/50 bg-background/30 backdrop-blur-xl flex flex-col hidden lg:flex">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <h2 className="font-medium text-sm">Agent Activity</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-indigo-400 animate-pulse uppercase tracking-wider mb-4">
            Live Stream
          </p>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex items-center gap-4 text-sm">
                <div className="z-10 flex items-center justify-center w-5 h-5 rounded-full bg-background">
                  {step.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {step.status === "running" && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                  {step.status === "pending" && <Circle className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className={`flex-1 ${step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 mt-8 border border-border/50 text-xs text-muted-foreground font-mono">
          <p className="mb-2 text-foreground/70 font-sans font-medium">Terminal Logs</p>
          <div className="space-y-1.5 opacity-70">
            <p>[10:42:01] Supervisor routing to Budget...</p>
            <p className="text-indigo-400">[10:42:02] BudgetAgent activated.</p>
            <p>[10:42:02] Allocating $4,000 for transport.</p>
            <p className="animate-pulse">_</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
