"use client"
import Link from "next/link"
import { Bookmark, Sparkles, Plane, ArrowRight, FolderPlus } from "lucide-react"

export default function SavedPlansPage() {
  const mockSavedPlans = [
    {
      id: 1,
      title: "Goa Beach Getaway",
      destination: "Goa, India",
      dateSaved: "Saved 2 days ago",
      estimatedCost: "₹38,500",
      vibe: "Tropical"
    },
    {
      id: 2,
      title: "Tokyo Neon Explorer",
      destination: "Tokyo, Japan",
      dateSaved: "Saved 1 week ago",
      estimatedCost: "$2,450",
      vibe: "Urban"
    }
  ]

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-indigo-400" /> Saved Blueprints
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Review saved draft itineraries and offline blueprints.</p>
      </div>

      {mockSavedPlans.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {mockSavedPlans.map((plan) => (
            <div 
              key={plan.id}
              className="p-5 rounded-2xl border border-white/5 bg-[#090d1a]/30 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-white">{plan.title}</h3>
                    <p className="text-xs text-muted-foreground">{plan.destination}</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    {plan.vibe}
                  </span>
                </div>
                <p className="text-[10px] text-white/40">{plan.dateSaved}</p>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block">Est. Cost</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">{plan.estimatedCost}</span>
                </div>

                <Link 
                  href={`/plan`} 
                  className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-indigo-400 transition-colors"
                >
                  Load to Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
          <FolderPlus className="w-8 h-8 text-white/10" />
          <p className="font-bold text-white">No Saved Plans Yet</p>
          <p className="text-xs max-w-xs leading-normal">Save intermediate draft states during requirements intake to access them here.</p>
        </div>
      )}
    </div>
  )
}
