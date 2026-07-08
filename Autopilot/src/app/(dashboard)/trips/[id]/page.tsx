"use client"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { 
  MapPin, 
  CalendarDays, 
  Wallet, 
  CloudSun, 
  Phone, 
  Check, 
  RefreshCw, 
  X, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  Sliders, 
  Play, 
  Trash2, 
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FileText
} from "lucide-react"

import { useTravelStore } from "@/lib/store"

export default function TripDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string
  
  const {
    activeTrip,
    logs,
    activeAgent,
    isPlanning,
    isBooking,
    simulationMode,
    budgetAllocations,
    priceDrift,
    setSimulationMode,
    setBudgetAllocations,
    loadTrip,
    reoptimize,
    checkPrices,
    approvePlan,
    executeBooking,
    cancelTripPlan,
    disconnectSse
  } = useTravelStore()

  const [inputBudget, setInputBudget] = useState<number>(0)
  const [checkedPacking, setCheckedPacking] = useState<Record<string, boolean>>({})
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Initialize and load
  useEffect(() => {
    if (tripId) {
      loadTrip(tripId)
    }
    return () => {
      disconnectSse()
    }
  }, [tripId])

  // Sync slider inputs
  useEffect(() => {
    if (activeTrip) {
      setInputBudget(activeTrip.budget_val)
    }
  }, [activeTrip])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  if (!activeTrip) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Fetching trip blueprint...</p>
        </div>
      </div>
    )
  }

  const hasItinerary = activeTrip.plan && activeTrip.plan.itinerary && activeTrip.plan.itinerary.length > 0
  const totalAllocationSum = Object.values(budgetAllocations).reduce((a, b) => a + b, 0)

  // Math helper for allocations
  const getAbsoluteCost = (percent: number) => {
    return Math.round(activeTrip.budget_val * (percent / 100))
  }

  // Packing check handler
  const togglePackingItem = (item: string) => {
    setCheckedPacking(prev => ({
      ...prev,
      [item]: !prev[item]
    }))
  }

  // Slider adjustments
  const handleSliderChange = (key: string, value: number) => {
    setBudgetAllocations({
      ...budgetAllocations,
      [key]: value
    })
  }

  // Dynamic SVG mapping coordinates
  const renderSvgMap = () => {
    if (!hasItinerary) return null
    
    // Extract all events coordinate
    const points: Array<{ title: string; lat: number; lng: number; kind: string }> = []
    
    // Gather coordinates
    activeTrip.plan?.itinerary?.forEach(day => {
      day.events.forEach(evt => {
        if (evt.lat && evt.lng) {
          points.push({
            title: evt.title,
            lat: evt.lat,
            lng: evt.lng,
            kind: evt.title.toLowerCase().includes("flight") 
              ? "flight" 
              : evt.title.toLowerCase().includes("hotel") 
                ? "hotel" 
                : "activity"
          })
        }
      })
    })

    if (points.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No map coordinates generated.
        </div>
      )
    }

    // Find bounding box for scaling
    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const latRange = maxLat - minLat || 0.1
    const lngRange = maxLng - minLng || 0.1

    // Map to width=280, height=220 coordinates with padding
    const width = 280
    const height = 220
    const padding = 25

    const getPixels = (lat: number, lng: number) => {
      // Map longitude to x
      const x = padding + ((lng - minLng) / lngRange) * (width - 2 * padding)
      // Map latitude to y (invert since svg y increases downwards)
      const y = height - padding - ((lat - minLat) / latRange) * (height - 2 * padding)
      return { x, y }
    }

    const scaledPoints = points.map(p => ({
      ...p,
      ...getPixels(p.lat, p.lng)
    }))

    // Build curved path
    let dPath = ""
    scaledPoints.forEach((pt, idx) => {
      if (idx === 0) {
        dPath += `M ${pt.x} ${pt.y}`
      } else {
        const prev = scaledPoints[idx - 1]
        const cx = (prev.x + pt.x) / 2
        const cy = (prev.y + pt.y) / 2 - 15 // bend slightly
        dPath += ` Q ${cx} ${cy}, ${pt.x} ${pt.y}`
      }
    })

    return (
      <svg className="w-full h-full bg-[#070b19] rounded-2xl border border-white/5" viewBox={`0 0 ${width} ${height}`}>
        {/* Background Grid */}
        <defs>
          <pattern id="grid" width="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Path Lines */}
        <path 
          d={dPath} 
          fill="none" 
          stroke="url(#gradient-line)" 
          strokeWidth="2.5" 
          strokeDasharray="5,4" 
          className="animate-[dash_10s_linear_infinite]"
        />

        {/* Path Gradient */}
        <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        {/* Points */}
        {scaledPoints.map((pt, idx) => {
          const isSpecial = pt.kind === "flight" || pt.kind === "hotel"
          const color = pt.kind === "flight" 
            ? "#22d3ee" 
            : pt.kind === "hotel" 
              ? "#6366f1" 
              : "#a855f7"
          
          return (
            <g key={idx} className="group cursor-pointer">
              {/* Outer pulsing ring for key nodes */}
              {isSpecial && (
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="7" 
                  fill={color} 
                  opacity="0.3" 
                  className="animate-ping"
                />
              )}
              {/* Point Node */}
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r={isSpecial ? 5.5 : 4} 
                fill={color} 
                stroke="#070b19" 
                strokeWidth="1.5"
                className="transition hover:scale-150"
              />
              {/* Text tooltip on hover */}
              <title>{pt.title}</title>
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 print-full">
      
      {/* Printable Area styled overlay (hides UI widgets on window print) */}
      <style jsx global>{`
        @media print {
          aside, button, form, .no-print {
            display: none !important;
          }
          main {
            border: none !important;
            padding: 0 !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
        }
      `}</style>
        
      {/* Navigation / Actions Bar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 no-print">
        <Link href="/plan" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to Planner
        </Link>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()}
            disabled={isPlanning || isBooking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-secondary/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button 
            onClick={() => cancelTripPlan(Number(tripId))}
            disabled={isPlanning || isBooking || activeTrip.status.toLowerCase() === "cancelled"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Cancel Trip
          </button>
        </div>
      </div>

      {/* Title, Banner, and Details */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
              activeTrip.status.toLowerCase() === "booked" 
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : activeTrip.status.toLowerCase() === "cancelled"
                  ? "bg-red-500/10 text-red-300 border border-red-500/20"
                  : activeTrip.status.toLowerCase() === "planning"
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 animate-pulse"
                    : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
            }`}>
              {activeTrip.status}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">{activeTrip.title}</h1>
          </div>
          
          {/* Costs overview */}
          <div className="flex items-center gap-4 bg-secondary/20 border border-border/50 rounded-2xl px-5 py-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Allocated Budget</span>
              <span className="text-xl font-bold font-mono text-cyan-300">{activeTrip.budget}</span>
            </div>
            <div className="h-8 w-px bg-border/40" />
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Estimated Cost</span>
              <span className="text-xl font-bold font-mono text-indigo-300">{activeTrip.estimated_cost}</span>
            </div>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{activeTrip.summary}</p>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-secondary/40 px-3 py-1.5 rounded-full"><MapPin className="w-3.5 h-3.5 text-indigo-400"/> {activeTrip.destination}</span>
          <span className="flex items-center gap-1.5 bg-secondary/40 px-3 py-1.5 rounded-full"><CalendarDays className="w-3.5 h-3.5 text-cyan-400"/> {activeTrip.dates}</span>
          <span className="flex items-center gap-1.5 bg-secondary/40 px-3 py-1.5 rounded-full uppercase"><Sparkles className="w-3.5 h-3.5 text-purple-400"/> Vibe: {activeTrip.preferences.vibe || "Standard"}</span>
        </div>
      </div>

      {/* Dashboard Widgets Row (Sliders, Map, Sandbox controls) */}
      <div className="grid gap-6 md:grid-cols-3 no-print">
        
        {/* 1. Cooperative Budget Allocator */}
        <div className="bg-secondary/10 border border-border/40 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Sliders className="w-4 h-4 text-cyan-300"/> Budget Split</h2>
            <span className={`text-xs font-bold font-mono ${totalAllocationSum === 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {totalAllocationSum}%
            </span>
          </div>
          
          <div className="space-y-3.5">
            {[
              { key: "transport", label: "Transport (35%)", color: "bg-cyan-400" },
              { key: "accommodation", label: "Stay (30%)", color: "bg-indigo-500" },
              { key: "food", label: "Food (15%)", color: "bg-orange-400" },
              { key: "activities", label: "Activities (12%)", color: "bg-purple-500" },
              { key: "buffer", label: "Buffer (8%)", color: "bg-emerald-400" }
            ].map(alloc => (
              <div key={alloc.key} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{alloc.label.split(" ")[0]}</span>
                  <span className="font-mono text-foreground/80">{budgetAllocations[alloc.key] || 0}% ({activeTrip.currency === 'INR' ? '₹' : '$'}{getAbsoluteCost(budgetAllocations[alloc.key] || 0).toLocaleString()})</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  disabled={isPlanning || isBooking}
                  value={budgetAllocations[alloc.key] || 0}
                  onChange={(e) => handleSliderChange(alloc.key, int(e.target.value))}
                  className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
                />
              </div>
            ))}
          </div>

          {totalAllocationSum !== 100 && (
            <p className="text-[11px] text-yellow-400/80 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Splits must total 100% to re-optimize.
            </p>
          )}

          <button
            onClick={() => reoptimize(Number(tripId), activeTrip.budget_val)}
            disabled={isPlanning || isBooking || totalAllocationSum !== 100}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500 text-black text-xs font-semibold hover:bg-cyan-400 disabled:opacity-40 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
          >
            {isPlanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Re-optimize Trip
          </button>
        </div>

        {/* 2. Map visualizer */}
        <div className="bg-secondary/10 border border-border/40 rounded-3xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-300"/> GPS Route Sequence</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Interactive sequenced path generated by the Itinerary Agent.</p>
          </div>
          
          <div className="flex-1 min-h-[160px] relative">
            {renderSvgMap()}
          </div>
        </div>

        {/* 3. Booking Saga Sandbox */}
        <div className="bg-secondary/10 border border-border/40 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-300"/> Booking Saga Sandbox</h2>
            <p className="text-[11px] text-muted-foreground">Select a GDS reservation simulation mode to test transaction safety policies (Stop 09/10).</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "success", label: "Success Mode", desc: "All legs book OK" },
              { id: "hotel_sold_out", label: "Hotel Sold Out", desc: "Triggers saga rollback" }
            ].map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSimulationMode(mode.id)}
                disabled={isPlanning || isBooking}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  simulationMode === mode.id 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200' 
                    : 'border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <p className="text-xs font-semibold">{mode.label}</p>
                <p className="text-[9px] mt-0.5 opacity-75">{mode.desc}</p>
              </button>
            ))}
          </div>

          {priceDrift && priceDrift.drift && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-2.5 text-xs text-yellow-300 space-y-1">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Price drift warning!</p>
              <p className="text-[10px]">Cost increased by {activeTrip.currency === 'INR' ? '₹' : '$'}{priceDrift.delta.toLocaleString()}. New Total: {activeTrip.currency === 'INR' ? '₹' : '$'}{priceDrift.newTotal.toLocaleString()}.</p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => approvePlan(Number(tripId))} className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-bold">Accept Delta</button>
                <button onClick={() => cancelTripPlan(Number(tripId))} className="text-yellow-300 underline text-[10px] py-0.5">Cancel</button>
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              if (activeTrip.status.toLowerCase() === "approval_pending") {
                await executeBooking(Number(tripId))
              } else {
                await checkPrices(Number(tripId))
              }
            }}
            disabled={isPlanning || isBooking || activeTrip.status.toLowerCase() === "booked" || activeTrip.status.toLowerCase() === "cancelled"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-foreground/90 disabled:opacity-40 transition-all cursor-pointer"
          >
            {isBooking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reserving legs (Saga)...
              </>
            ) : activeTrip.status.toLowerCase() === "approval_pending" ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Authorize & Book Trip
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Validate Prices & Lock
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.8fr_1.2fr]">
        
        {/* Left Column: Itinerary list */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight border-b border-border/30 pb-2">Day-by-Day Itinerary</h2>
          
          {hasItinerary ? (
            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:ml-px before:h-full before:w-0.5 before:bg-border/40">
              {activeTrip.plan?.itinerary?.map((day) => (
                <div key={day.day} className="relative pl-8 group">
                  {/* Circle Bullet */}
                  <div className="absolute left-0 top-1.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 border-indigo-500 bg-background text-[10px] font-bold text-indigo-300 shadow group-hover:scale-110 transition-transform">
                    {day.day}
                  </div>
                  
                  <div className="rounded-2xl border border-border/40 bg-secondary/15 p-5 hover:bg-secondary/25 transition-all space-y-4">
                    <h3 className="text-lg font-bold text-indigo-300">{day.title}</h3>
                    
                    <div className="space-y-4 relative">
                      {day.events.map((evt, idx) => (
                        <div key={idx} className="flex gap-4 items-start text-sm">
                          <span className="font-mono text-xs font-semibold bg-secondary/50 text-indigo-400 px-2 py-0.5 rounded shrink-0 w-16 text-center">{evt.time}</span>
                          <div className="space-y-0.5 flex-1">
                            <p className="font-semibold text-foreground">{evt.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{evt.desc}</p>
                            {evt.lat && (
                              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5"/> {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="font-medium">The specialist agents are currently building your itinerary...</p>
            </div>
          )}
        </div>

        {/* Right Column: Local Info, Checklist, Flights, Hotels */}
        <div className="space-y-6">
          
          {/* 1. Local info widget */}
          {activeTrip.preferences.local_info && (
            <div className="rounded-3xl border border-border/40 bg-[#0c1122]/70 p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CloudSun className="w-4 h-4 text-cyan-300"/> Regional Briefing</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Weather */}
                <div className="bg-secondary/20 rounded-2xl p-3 text-sm border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Weather forecast</p>
                  <p className="font-bold text-base mt-1 text-white">{activeTrip.preferences.local_info.weather?.temp} {activeTrip.preferences.local_info.weather?.condition}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{activeTrip.preferences.local_info.weather?.desc}</p>
                </div>
                {/* Currency */}
                <div className="bg-secondary/20 rounded-2xl p-3 text-sm border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Local Currency</p>
                  <p className="font-bold text-base mt-1 text-white">{activeTrip.preferences.local_info.currency?.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{activeTrip.preferences.local_info.currency?.rate}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground leading-relaxed"><strong className="text-foreground font-semibold">Visa basics:</strong> {activeTrip.preferences.local_info.visa}</p>
                <p className="text-muted-foreground leading-relaxed"><strong className="text-foreground font-semibold">Safety:</strong> {activeTrip.preferences.local_info.safety}</p>
              </div>
            </div>
          )}

          {/* 2. Custom packing list checklist */}
          {activeTrip.preferences.packing_list && (
            <div className="rounded-3xl border border-border/40 bg-secondary/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-purple-300"/> Packing Checklist</h3>
                <span className="text-xs text-muted-foreground font-semibold font-mono">
                  {Object.values(checkedPacking).filter(Boolean).length} / {activeTrip.preferences.packing_list.length} packed
                </span>
              </div>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeTrip.preferences.packing_list.map((item, idx) => (
                  <label 
                    key={idx} 
                    onClick={() => togglePackingItem(item.item)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-secondary/20 transition-all cursor-pointer text-xs ${
                      checkedPacking[item.item] ? 'opacity-50 line-through border-indigo-500/20' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checkedPacking[item.item] ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-border'
                    }`}>
                      {checkedPacking[item.item] && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.item}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.category}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. Confirmed Segments summary */}
          {activeTrip.segments && activeTrip.segments.length > 0 && (
            <div className="rounded-3xl border border-border/40 bg-secondary/15 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Leg Reservations</h3>
              <div className="space-y-2">
                {activeTrip.segments.map((seg) => (
                  <div key={seg.id} className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/30 text-xs">
                    <div>
                      <p className="font-bold capitalize text-white">{seg.kind} - {seg.provider}</p>
                      <p className="text-[10px] text-muted-foreground">{seg.provider_ref}</p>
                    </div>
                    
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="font-semibold font-mono text-white">{activeTrip.currency === 'INR' ? '₹' : '$'}{seg.price.toLocaleString()}</p>
                        <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize mt-0.5 ${
                          seg.status === 'confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-300' 
                            : seg.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-300'
                              : 'bg-yellow-500/10 text-yellow-300'
                        }`}>
                          {seg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Orders list (Transaction Receipts) */}
          {activeTrip.orders && activeTrip.orders.length > 0 && (
            <div className="rounded-3xl border border-border/40 bg-secondary/10 p-5 space-y-3">
              <h3 className="text-sm font-semibold">Transaction Ledger</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activeTrip.orders.map((ord) => (
                  <div key={ord.id} className="flex justify-between items-center p-2 rounded-xl bg-background/30 border border-border/20 text-[11px]">
                    <div>
                      <p className="font-semibold font-mono text-foreground/80">ID: {ord.id}</p>
                      <p className="text-[9px] text-muted-foreground">{ord.provider} | {new Date(ord.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-foreground">{activeTrip.currency === 'INR' ? '₹' : '$'}{ord.amount.toLocaleString()}</p>
                      <span className={`text-[9px] font-medium ${
                        ord.status === 'confirmed' 
                          ? 'text-emerald-400' 
                          : ord.status === 'refunded'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}>{ord.status.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}

// Inline helper for client parsing
function int(val: string): number {
  const parsed = parseInt(val, 10)
  return isNaN(parsed) ? 0 : parsed
}
