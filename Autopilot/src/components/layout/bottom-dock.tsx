"use client"
import { Check, Coins, TrendingUp } from "lucide-react"

export function BottomDock() {
  return (
    <div className="w-full bg-background/80 backdrop-blur-xl border-t border-border/50 p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        
        {/* Budget Meter */}
        <div className="flex items-center gap-6 flex-1">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Estimated Cost
            </span>
            <span className="text-xl font-bold font-mono">$3,842</span>
          </div>
          
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-sm hidden sm:block">
            <div className="h-full bg-indigo-500 w-[65%]" />
          </div>
          
          <div className="flex flex-col hidden sm:flex">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
              <Coins className="w-3 h-3" /> Tokens Used
            </span>
            <span className="text-sm font-medium font-mono text-muted-foreground">42,084</span>
          </div>
        </div>

        {/* Action Button */}
        <button className="bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-foreground/90 transition-all shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5">
          <Check className="w-4 h-4" />
          Approve Plan
        </button>

      </div>
    </div>
  )
}
