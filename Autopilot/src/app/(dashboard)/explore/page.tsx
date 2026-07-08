"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, Sparkles, Loader2, ArrowRight, Sun, Thermometer, MapPin } from "lucide-react"
import { createTrip } from "@/lib/api"

export default function ExplorePage() {
  const router = useRouter()
  const [planningId, setPlanningId] = useState<string | null>(null)

  const curatedDestinations = [
    {
      id: "goa",
      name: "Goa, India",
      tagline: "Sun-drenched beaches & Latin quarters",
      prompt: "5 day beach getaway to Goa in December for ₹35,000",
      cost: "₹35,000",
      weather: "29°C, Sunny",
      flightTime: "1h 15m from BOM",
      vibe: "Tropical Chill",
      bgGradient: "from-cyan-500/10 via-teal-500/5 to-transparent border-cyan-500/15 hover:border-cyan-500/30",
      accentColor: "text-cyan-400 bg-cyan-500/10",
      desc: "Scout historic forts (Fort Aguada), walk along Calangute beach, and explore the Latin Quarter (Fontainhas) in Panaji."
    },
    {
      id: "tokyo",
      name: "Tokyo, Japan",
      tagline: "Futuristic neon grids & shrines",
      prompt: "6 days exploring Tokyo city highlights under $2,200",
      cost: "$2,200",
      weather: "12°C, Cool",
      flightTime: "7h 30m from DEL",
      vibe: "Urban Explorer",
      bgGradient: "from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/15 hover:border-indigo-500/30",
      accentColor: "text-indigo-400 bg-indigo-500/10",
      desc: "Cross Shibuya, see Senso-ji temple in Asakusa, visit Ueno park cherry blossoms, and explore Akihabara electric town."
    },
    {
      id: "bali",
      name: "Bali, Indonesia",
      tagline: "Sacred temples & cliffside sunsets",
      prompt: "7 day tropical relaxation in Bali for $950",
      cost: "$950",
      weather: "30°C, Warm",
      flightTime: "8h 45m from BOM",
      vibe: "Retreat & Relax",
      bgGradient: "from-rose-500/10 via-orange-500/5 to-transparent border-rose-500/15 hover:border-rose-500/30",
      accentColor: "text-rose-400 bg-rose-500/10",
      desc: "Visit Uluwatu temple cliff walk, view Tegallalang rice terraces, walk monkey forest, and relax in Seminyak beach club."
    }
  ]

  const handlePlanDestination = async (destId: string, prompt: string) => {
    setPlanningId(destId)
    try {
      const res = await createTrip(prompt)
      router.push(`/trips/${res.trip.id}`)
    } catch (e) {
      console.error("Planning request failed:", e)
      setPlanningId(null)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
          <Compass className="w-6 h-6 text-indigo-400 animate-spin-slow" /> Explore Curated Journeys
        </h1>
        <p className="text-xs text-white/50 mt-1">Discover trending locations and delegate planning to the AI team with a single click.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {curatedDestinations.map((dest) => {
          const isCurrentPlanning = planningId === dest.id
          
          return (
            <div 
              key={dest.id}
              className={`rounded-3xl border bg-slate-900/10 p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group transition-all duration-300 ${dest.bgGradient}`}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${dest.accentColor}`}>
                    {dest.vibe}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-1">{dest.name}</h3>
                  <p className="text-xs text-white/50 leading-normal">{dest.tagline}</p>
                </div>

                <p className="text-xs text-white/60 leading-relaxed min-h-[72px]">{dest.desc}</p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-white/70 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-cyan-400" /> {dest.weather}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-purple-400" /> {dest.flightTime}</div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest block">Est. Cost</span>
                  <span className="text-sm font-extrabold font-mono text-cyan-400">{dest.cost}</span>
                </div>

                <button
                  onClick={() => handlePlanDestination(dest.id, dest.prompt)}
                  disabled={planningId !== null}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-black font-extrabold text-xs rounded-xl shadow-lg hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isCurrentPlanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Node Spawning...
                    </>
                  ) : (
                    <>
                      Plan Itinerary <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
