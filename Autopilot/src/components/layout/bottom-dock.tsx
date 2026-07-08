"use client"
import { Check, Coins, TrendingUp, Loader2, Sparkles, XCircle } from "lucide-react"
import { useTravelStore } from "@/lib/store"

export function BottomDock() {
  const { activeTrip, isPlanning, isBooking, executeBooking, checkPrices, priceDrift } = useTravelStore()

  if (!activeTrip) {
    return null
  }

  const budget = activeTrip.budget_val || 1
  const cost = activeTrip.estimated_cost_val || 0
  const ratio = Math.min((cost / budget) * 100, 100)
  const currencySymbol = activeTrip.budget.startsWith("$") ? "$" : "₹"

  // Live token count based on logged event items (Stop 13 Cost Driver tracking)
  const simulatedTokens = activeTrip.events ? (activeTrip.events.length * 2840) + 8450 : 0

  const statusLower = activeTrip.status.toLowerCase()

  const handlePrimaryAction = async () => {
    if (statusLower === "approval_pending") {
      await executeBooking(activeTrip.id)
    } else {
      await checkPrices(activeTrip.id)
    }
  }

  return (
    <div className="w-full bg-background/80 backdrop-blur-xl border-t border-border/50 p-4 no-print">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Budget & Cost Tracker */}
        <div className="flex items-center gap-6 flex-1 min-w-[240px]">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Estimated Cost
            </span>
            <span className="text-lg font-bold font-mono text-white">
              {activeTrip.estimated_cost} 
              <span className="text-xs text-muted-foreground font-normal font-sans ml-1">
                of {activeTrip.budget}
              </span>
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-xs hidden sm:block">
            <div 
              className={`h-full transition-all duration-500 ${
                cost > budget ? 'bg-red-500' : ratio > 85 ? 'bg-yellow-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${ratio}%` }}
            />
          </div>
          
          {/* Token Counter */}
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> Compute Tokens
            </span>
            <span className="text-xs font-semibold font-mono text-muted-foreground">
              {simulatedTokens.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {statusLower === "booked" ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xl">
              <Check className="w-4 h-4" /> Trip Confirmed & Booked!
            </div>
          ) : statusLower === "cancelled" ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xl">
              <XCircle className="w-4 h-4" /> Trip Cancelled
            </div>
          ) : (
            <button 
              onClick={handlePrimaryAction}
              disabled={isPlanning || isBooking}
              className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-all shadow-xl cursor-pointer"
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saga Booking...
                </>
              ) : isPlanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Agents Planning...
                </>
              ) : statusLower === "approval_pending" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Authorize & Book Trip
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                  Validate Prices & Lock
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
