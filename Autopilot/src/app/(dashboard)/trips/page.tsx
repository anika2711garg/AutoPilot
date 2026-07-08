"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Plane, ArrowRight, Loader2, Plus, Calendar, Wallet } from "lucide-react"
import { getTrips, type Trip } from "@/lib/api"

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTrips()
      .then(setTrips)
      .catch(() => setError("Could not load trips. Verify the backend is running."))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Trips</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and track your active agentic travel plans.</p>
        </div>
        
        <Link 
          href="/plan" 
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Plan a New Trip
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Syncing trips catalog...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center text-xs text-red-200 max-w-md mx-auto">
          {error}
        </div>
      ) : trips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="group flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-indigo-500/40 transition-all shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                      {trip.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{trip.destination}</p>
                  </div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    trip.status.toLowerCase() === 'booked' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : trip.status.toLowerCase() === 'cancelled'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {trip.status}
                  </span>
                </div>
                
                <p className="text-xs text-white/55 leading-relaxed truncate">{trip.summary}</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-5 text-[11px] font-semibold text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {trip.dates}</span>
                  <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> {trip.budget}</span>
                </div>
                <span className="text-white/70 flex items-center gap-1 group-hover:text-white transition-colors">
                  Open Control <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/5 bg-slate-900/5 p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
          <Plane className="w-10 h-10 text-white/10" />
          <div className="space-y-1">
            <p className="font-bold text-white">No Active Plans Yet</p>
            <p className="text-xs max-w-xs leading-relaxed text-muted-foreground">Enter a budget and destination in the agent workspace to construct your first itinerary.</p>
          </div>
          <Link href="/plan" className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl shadow-lg hover:bg-white/90 transition-all mt-2">
            Open Planner
          </Link>
        </div>
      )}
    </div>
  )
}
