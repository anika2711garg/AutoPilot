"use client"
import { Loader2, CheckCircle2, Circle, Check, Sparkles } from "lucide-react"
import { useEffect, useRef } from "react"
import { useTravelStore } from "@/lib/store"

const steps = [
  { id: "Requirements Agent", label: "Requirements Intake" },
  { id: "Budget Agent", label: "Budget Constraints" },
  { id: "Transport Agent", label: "Transit Scout" },
  { id: "Accommodation Agent", label: "Stays Shortlist" },
  { id: "Itinerary Agent", label: "Itinerary Sequencer" },
  { id: "Local Info Agent", label: "Regional Info" },
  { id: "Packing Agent", label: "Packing Checklist" },
  { id: "Supervisor", label: "Supervisor Assembly" },
  { id: "Booking Executor", label: "Booking Saga Executor" }
]

export function RightPanel() {
  const { activeTrip, logs, activeAgent, isPlanning, isBooking } = useTravelStore()
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // If no active trip is selected, show a beautiful standby registry status dashboard
  if (!activeTrip) {
    return (
      <aside className="w-80 border-l border-white/5 bg-slate-950/20 backdrop-blur-xl flex flex-col h-full overflow-hidden no-print">
        <div className="h-16 flex items-center px-6 border-b border-white/5 justify-between shrink-0">
          <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Agent Registry</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Standby
          </span>
        </div>
        
        <div className="p-5 border-b border-white/5 bg-white/2 space-y-2.5 shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active System Nodes</p>
          <div className="space-y-1.5">
            {steps.map(step => (
              <div key={step.id} className="flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/10" /> {step.label}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">Ready</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <Sparkles className="w-6 h-6 text-indigo-400/40 animate-pulse" />
          <p className="text-xs text-white/60 font-bold leading-normal">Orchestrator Standby</p>
          <p className="text-[10px] text-muted-foreground leading-normal max-w-[180px]">Spawn a planning workflow by submitting requirements in the workspace.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-80 border-l border-border/50 bg-[#050816]/40 backdrop-blur-xl flex flex-col hidden lg:flex no-print">
      <div className="h-16 flex items-center px-6 border-b border-border/50 justify-between">
        <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Agent Activity</h2>
        {isPlanning && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" /> Planning
          </span>
        )}
        {isBooking && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-0.5 text-[10px] text-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" /> Booking
          </span>
        )}
      </div>
      
      {/* Node checklist progress */}
      <div className="p-5 border-b border-border/40 bg-secondary/5 space-y-2.5">
        {steps.map((step, idx) => {
          const isCompleted = logs.some(l => l.data?.agent === step.id && (l.type === 'agent_end' || l.type === 'saga_end'))
          const isActive = activeAgent === step.id && isPlanning
          const isSagaActive = activeAgent === step.id && isBooking

          return (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full border ${
                isCompleted 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : (isActive || isSagaActive)
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
                    : 'border-border/60 text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className={`font-medium ${
                isCompleted 
                  ? 'text-muted-foreground/60 line-through' 
                  : (isActive || isSagaActive)
                    ? 'text-cyan-300 font-semibold'
                    : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
              {(isActive || isSagaActive) && <Loader2 className="w-3 h-3 text-cyan-300 animate-spin ml-auto" />}
            </div>
          )
        })}
      </div>

      {/* Console Standard Output */}
      <div className="flex-1 flex flex-col min-h-0 bg-black/40">
        <div className="h-9 px-6 border-b border-border/30 flex items-center bg-black/20">
          <span className="text-[9px] font-mono text-muted-foreground">STANDARD OUTPUT (STDOUT)</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed space-y-2 text-slate-300">
          {logs.length > 0 ? (
            logs.map((log) => {
              const color = log.type === 'agent_start' 
                ? 'text-cyan-400 font-bold' 
                : log.type === 'agent_end'
                  ? 'text-emerald-400'
                  : log.type === 'saga_rollback'
                    ? 'text-red-400 font-semibold animate-pulse'
                    : log.type === 'saga_rollback_completed'
                      ? 'text-orange-400 font-semibold'
                      : log.type === 'agent_error'
                        ? 'text-red-400'
                        : 'text-slate-300'
              
              return (
                <div key={log.id} className="space-y-0.5 border-b border-white/5 pb-1">
                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                    <span>[{new Date(log.at).toLocaleTimeString()}]</span>
                    <span className="uppercase text-cyan-500 font-semibold">@{log.data?.agent || 'System'}</span>
                  </div>
                  <p className={color}>{log.data?.message}</p>
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground italic">Awaiting pipeline stream...</p>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </aside>
  )
}
