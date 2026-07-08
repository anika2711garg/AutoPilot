"use client"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  FileText,
  Plane,
  Home,
  CheckSquare,
  DollarSign,
  Info
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
  const [activePackingTab, setActivePackingTab] = useState<string>("All")

  // Initialize and load
  useEffect(() => {
    if (tripId) {
      loadTrip(tripId)
    }
    return () => {
      disconnectSse()
    }
  }, [tripId])

  // Sync inputs
  useEffect(() => {
    if (activeTrip) {
      setInputBudget(activeTrip.budget_val)
    }
  }, [activeTrip])

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
  const currencySymbol = activeTrip.budget.startsWith("$") ? "$" : "₹"

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

  // Categories in Packing list
  const packingCategories = ["All", "Essentials", "Clothing", "Electronics", "Medical", "Accessories"]
  const filteredPackingList = activeTrip.preferences.packing_list?.filter(item => 
    activePackingTab === "All" || item.category.toLowerCase() === activePackingTab.toLowerCase()
  ) || []

  // Dynamic SVG mapping coordinates
  const renderSvgMap = () => {
    if (!hasItinerary) return null
    
    const points: Array<{ title: string; lat: number; lng: number; kind: string }> = []
    
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

    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const latRange = maxLat - minLat || 0.1
    const lngRange = maxLng - minLng || 0.1

    const width = 280
    const height = 220
    const padding = 25

    const getPixels = (lat: number, lng: number) => {
      const x = padding + ((lng - minLng) / lngRange) * (width - 2 * padding)
      const y = height - padding - ((lat - minLat) / latRange) * (height - 2 * padding)
      return { x, y }
    }

    const scaledPoints = points.map(p => ({
      ...p,
      ...getPixels(p.lat, p.lng)
    }))

    let dPath = ""
    scaledPoints.forEach((pt, idx) => {
      if (idx === 0) {
        dPath += `M ${pt.x} ${pt.y}`
      } else {
        const prev = scaledPoints[idx - 1]
        const cx = (prev.x + pt.x) / 2
        const cy = (prev.y + pt.y) / 2 - 15
        dPath += ` Q ${cx} ${cy}, ${pt.x} ${pt.y}`
      }
    })

    return (
      <svg className="w-full h-full bg-slate-950/40 rounded-2xl border border-white/5" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern id="mapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />

        <path 
          d={dPath} 
          fill="none" 
          stroke="url(#mapGrad)" 
          strokeWidth="2" 
          strokeDasharray="4,4" 
        />

        <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>

        {scaledPoints.map((pt, idx) => {
          const isSpecial = pt.kind === "flight" || pt.kind === "hotel"
          const color = pt.kind === "flight" 
            ? "#06b6d4" 
            : pt.kind === "hotel" 
              ? "#6366f1" 
              : "#a855f7"
          
          return (
            <g key={idx} className="group cursor-pointer">
              {isSpecial && (
                <circle cx={pt.x} cy={pt.y} r="8" fill={color} opacity="0.2" className="animate-pulse" />
              )}
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r={isSpecial ? 5 : 3.5} 
                fill={color} 
                stroke="#020617" 
                strokeWidth="1.5"
              />
              <title>{pt.title}</title>
            </g>
          )
        })}
      </svg>
    )
  }

  // Render Saga Booking steps flows
  const renderSagaFlow = () => {
    const flightSeg = activeTrip.segments?.find(s => s.kind === 'flight')
    const hotelSeg = activeTrip.segments?.find(s => s.kind === 'hotel')
    
    const flightStatus = flightSeg?.status || 'pending'
    const hotelStatus = hotelSeg?.status || 'pending'

    return (
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plane className="w-4 h-4 text-indigo-400" /> Live Transaction Saga
        </h3>
        
        <div className="relative flex items-center justify-between px-4 py-2">
          {/* Connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          <div className={`absolute top-1/2 left-0 h-0.5 -translate-y-1/2 z-0 transition-all duration-500 ${
            flightStatus === 'confirmed' ? 'w-1/2 bg-indigo-500' : ''
          } ${
            hotelStatus === 'confirmed' ? 'w-full bg-indigo-500' : ''
          }`} />

          {/* Step 1: Flight booking */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-slate-950 p-2.5 rounded-2xl border border-white/5 min-w-[100px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              flightStatus === 'confirmed' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : flightStatus === 'cancelled'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-muted-foreground border border-white/5'
            }`}>
              <Plane className="w-4 h-4" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold">Flight Leg</p>
              <p className="text-[8px] uppercase tracking-wider font-mono text-muted-foreground">
                {flightStatus === 'confirmed' ? 'Confirmed' : flightStatus === 'cancelled' ? 'Refunded' : 'Awaiting'}
              </p>
            </div>
          </div>

          {/* Step 2: Hotel booking */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-slate-950 p-2.5 rounded-2xl border border-white/5 min-w-[100px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              hotelStatus === 'confirmed' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : hotelStatus === 'failed'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-white/5 text-muted-foreground border border-white/5'
            }`}>
              <Home className="w-4 h-4" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold">Stay Leg</p>
              <p className="text-[8px] uppercase tracking-wider font-mono text-muted-foreground">
                {hotelStatus === 'confirmed' ? 'Confirmed' : hotelStatus === 'failed' ? 'Sold Out' : 'Awaiting'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Compensation Explanation */}
        {flightStatus === 'cancelled' && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300 leading-relaxed flex gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Saga Compensation Triggered:</strong> Hotel check failed due to sold-out inventory. The verified flight ticket has been automatically voided and a full refund was routed to avoid partial failure.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 print-full max-w-6xl mx-auto">
      
      {/* Navigation & Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5 no-print">
        <Link href="/plan" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft className="w-4 h-4" /> Return to Planner
        </Link>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            disabled={isPlanning || isBooking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
          >
            <Printer className="w-4 h-4" /> Export PDF
          </button>
          <button 
            onClick={() => cancelTripPlan(Number(tripId))}
            disabled={isPlanning || isBooking || activeTrip.status.toLowerCase() === "cancelled"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
          >
            <Trash2 className="w-4 h-4" /> Cancel Trip
          </button>
        </div>
      </div>

      {/* Main Details Hero */}
      <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="space-y-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              activeTrip.status.toLowerCase() === "booked" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                : activeTrip.status.toLowerCase() === "cancelled"
                  ? "bg-red-500/10 text-red-400 border border-red-500/25"
                  : activeTrip.status.toLowerCase() === "planning"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 animate-pulse"
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                activeTrip.status.toLowerCase() === "booked" ? "bg-emerald-400" : activeTrip.status.toLowerCase() === "cancelled" ? "bg-red-400" : "bg-indigo-400"
              }`} />
              {activeTrip.status}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              {activeTrip.title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/60">{activeTrip.summary}</p>
          </div>

          <div className="flex items-center gap-4 bg-black/30 border border-white/5 backdrop-blur-md rounded-2xl p-4 shrink-0">
            <div className="text-left">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">Total Budget</span>
              <span className="text-2xl font-extrabold font-mono text-cyan-400">{activeTrip.budget}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-left">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">Est. Cost</span>
              <span className="text-2xl font-extrabold font-mono text-indigo-400">{activeTrip.estimated_cost}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/70">
          <span className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl"><MapPin className="w-4 h-4 text-indigo-400"/> {activeTrip.destination}</span>
          <span className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl"><CalendarDays className="w-4 h-4 text-cyan-400"/> {activeTrip.dates}</span>
          <span className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl uppercase"><Sparkles className="w-4 h-4 text-purple-400"/> Vibe: {activeTrip.preferences.vibe || "Standard"}</span>
        </div>
      </div>

      {/* Grid Dashboard Widgets (no-print) */}
      <div className="grid gap-6 md:grid-cols-3 no-print">
        
        {/* Widget 1: Sliders & Stacked Budget Bar */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sliders className="w-4 h-4 text-cyan-300"/> Budget Allocator</h2>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${totalAllocationSum === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {totalAllocationSum}%
              </span>
            </div>

            {/* Dynamic Stacked allocation bar */}
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${budgetAllocations.transport || 0}%` }} title="Transport" />
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${budgetAllocations.accommodation || 0}%` }} title="Stay" />
              <div className="h-full bg-orange-400 transition-all duration-300" style={{ width: `${budgetAllocations.food || 0}%` }} title="Food" />
              <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${budgetAllocations.activities || 0}%` }} title="Activities" />
              <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${budgetAllocations.buffer || 0}%` }} title="Buffer" />
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: "transport", label: "Transport", color: "text-cyan-400" },
              { key: "accommodation", label: "Accommodation", color: "text-indigo-400" },
              { key: "food", label: "Food & Dining", color: "text-orange-400" },
              { key: "activities", label: "Sightseeing", color: "text-purple-400" },
              { key: "buffer", label: "Buffer Ratio", color: "text-emerald-400" }
            ].map(item => (
              <div key={item.key} className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className={item.color}>{item.label}</span>
                  <span className="font-mono text-white/80">{budgetAllocations[item.key] || 0}% ({currencySymbol}{getAbsoluteCost(budgetAllocations[item.key] || 0).toLocaleString()})</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  disabled={isPlanning || isBooking}
                  value={budgetAllocations[item.key] || 0}
                  onChange={(e) => handleSliderChange(item.key, int(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => reoptimize(Number(tripId), activeTrip.budget_val)}
            disabled={isPlanning || isBooking}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 transition-all shadow-lg cursor-pointer"
          >
            {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-optimize Ratios
          </button>
        </div>

        {/* Widget 2: Map & GPS Sequence */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-300"/> Geographic Route</h2>
            <p className="text-[10px] text-muted-foreground">Sequenced stops geolocated and mapped chronologically.</p>
          </div>
          
          <div className="flex-1 min-h-[180px] relative">
            {renderSvgMap()}
          </div>
        </div>

        {/* Widget 3: GDS Saga Simulator & Payments */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-300"/> GDS Sandbox Simulator</h2>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "success", title: "Standard Success", desc: "No inventory drift" },
                { id: "hotel_sold_out", title: "Hotel Sold Out", desc: "Triggers void saga" }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSimulationMode(m.id)}
                  disabled={isPlanning || isBooking}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    simulationMode === m.id 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' 
                      : 'border-white/5 bg-black/20 text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-bold">{m.title}</p>
                  <p className="text-[9px] mt-0.5 opacity-70 leading-normal">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {priceDrift && priceDrift.drift && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-300 space-y-2">
              <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Pre-booking Price Drift detected!</div>
              <p className="text-[10px] leading-relaxed">Leg ticket rates spiked by {currencySymbol}{priceDrift.delta.toLocaleString()} before checkout. New total will be {currencySymbol}{priceDrift.newTotal.toLocaleString()}.</p>
              <div className="flex gap-2 font-bold">
                <button onClick={() => approvePlan(Number(tripId))} className="bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer">Accept Delta</button>
                <button onClick={() => cancelTripPlan(Number(tripId))} className="text-yellow-300 underline text-[10px] py-1 cursor-pointer">Cancel</button>
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer shadow-xl"
          >
            {isBooking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" /> Reserving ticket legs (Saga)...
              </>
            ) : activeTrip.status.toLowerCase() === "approval_pending" ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Authorize Checkout & Book
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Validate Price Availability
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main Grid Layout content */}
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1.3fr]">
        
        {/* Left Column: Rich Travel Timeline */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight border-b border-white/5 pb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" /> Daily Schedule
          </h2>
          
          {hasItinerary ? (
            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:ml-px before:h-full before:w-0.5 before:bg-white/5">
              {activeTrip.plan?.itinerary?.map((day) => (
                <div key={day.day} className="relative pl-9 group">
                  <div className="absolute left-0 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-indigo-500 bg-slate-950 text-xs font-extrabold text-indigo-300 shadow">
                    {day.day}
                  </div>
                  
                  <div className="rounded-3xl border border-white/5 bg-slate-900/10 p-5 hover:bg-slate-900/30 transition-all space-y-4">
                    <h3 className="text-base font-extrabold text-indigo-200">{day.title}</h3>
                    
                    <div className="space-y-4">
                      {day.events.map((evt, idx) => {
                        const isFlight = evt.title.toLowerCase().includes("flight")
                        const isCheckin = evt.title.toLowerCase().includes("check-in")
                        
                        return (
                          <div key={idx} className={`p-4 rounded-2xl border transition-all ${
                            isFlight 
                              ? 'border-cyan-500/10 bg-cyan-500/5' 
                              : isCheckin 
                                ? 'border-indigo-500/10 bg-indigo-500/5' 
                                : 'border-white/5 bg-black/10'
                          }`}>
                            <div className="flex gap-3 items-start">
                              <span className="font-mono text-[10px] font-bold bg-white/5 text-indigo-400 px-2 py-0.5 rounded shrink-0">{evt.time}</span>
                              <div className="space-y-1 flex-1">
                                <h4 className="font-bold text-sm text-white">{evt.title}</h4>
                                <p className="text-xs text-white/50 leading-relaxed">{evt.desc}</p>
                                {evt.lat && (
                                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 text-muted-foreground"/> {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3 bg-slate-950/20">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="font-medium text-white/70">Assembling structured daily plan nodes...</p>
            </div>
          )}
        </div>

        {/* Right Column: Widgets, Checklists, receipts */}
        <div className="space-y-6">
          
          {/* Widget 1: Regional advisories & weather info */}
          {activeTrip.preferences.local_info && (
            <div className="rounded-3xl border border-white/5 bg-[#090d1a]/50 p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CloudSun className="w-4 h-4 text-cyan-400"/> Regional Briefing</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 rounded-2xl p-3 border border-white/5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Forecast</p>
                  <p className="font-bold text-base mt-1 text-white">{activeTrip.preferences.local_info.weather?.temp} {activeTrip.preferences.local_info.weather?.condition}</p>
                  <p className="text-[9px] text-white/40 mt-1 leading-normal">{activeTrip.preferences.local_info.weather?.desc}</p>
                </div>
                <div className="bg-slate-950/60 rounded-2xl p-3 border border-white/5">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Exchange Rate</p>
                  <p className="font-bold text-base mt-1 text-white">{activeTrip.preferences.local_info.currency?.name}</p>
                  <p className="text-[9px] text-white/40 mt-1 leading-normal">{activeTrip.preferences.local_info.currency?.rate}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-white/5 pt-3 leading-relaxed">
                <p className="text-white/60"><strong className="text-white font-semibold">Visa status:</strong> {activeTrip.preferences.local_info.visa}</p>
                <p className="text-white/60"><strong className="text-white font-semibold">Safety advisory:</strong> {activeTrip.preferences.local_info.safety}</p>
              </div>
            </div>
          )}

          {/* Saga Transaction Visual Map node flow */}
          {activeTrip.status.toLowerCase() !== "planning" && renderSagaFlow()}

          {/* Widget 2: Custom checklist with filter tabs */}
          {activeTrip.preferences.packing_list && (
            <div className="rounded-3xl border border-white/5 bg-slate-900/20 p-5 space-y-4 no-print">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4 text-purple-300"/> Packing checklist</h3>
                <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/70 font-semibold">
                  {Object.values(checkedPacking).filter(Boolean).length} / {activeTrip.preferences.packing_list.length} packed
                </span>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1 border-b border-white/5 pb-3">
                {packingCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActivePackingTab(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      activePackingTab === cat 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredPackingList.length > 0 ? (
                  filteredPackingList.map((item, idx) => (
                    <label 
                      key={idx} 
                      onClick={() => togglePackingItem(item.item)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-900/40 transition-all cursor-pointer text-xs ${
                        checkedPacking[item.item] ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        checkedPacking[item.item] ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/10'
                      }`}>
                        {checkedPacking[item.item] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{item.item}</p>
                        <p className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">{item.category}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No items under {activePackingTab}</p>
                )}
              </div>
            </div>
          )}

          {/* Widget 3: Confirmed legs list */}
          {activeTrip.segments && activeTrip.segments.length > 0 && (
            <div className="rounded-3xl border border-white/5 bg-slate-900/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Leg Reservations</h3>
              <div className="space-y-2">
                {activeTrip.segments.map((seg) => {
                  const confirmed = seg.status === 'confirmed'
                  const cancelled = seg.status === 'cancelled'
                  return (
                    <div key={seg.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-white/5 text-xs">
                      <div>
                        <p className="font-bold capitalize text-white">{seg.kind} - {seg.provider}</p>
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{seg.provider_ref}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold font-mono text-white">{currencySymbol}{seg.price.toLocaleString()}</p>
                        <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                          confirmed 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : cancelled
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            confirmed ? 'bg-emerald-400' : cancelled ? 'bg-amber-400' : 'bg-red-400'
                          }`} />
                          {seg.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Widget 4: Receipts ledger */}
          {activeTrip.orders && activeTrip.orders.length > 0 && (
            <div className="rounded-3xl border border-white/5 bg-[#090d1a]/40 p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-400" /> Transaction Ledger</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activeTrip.orders.map((ord) => (
                  <div key={ord.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px]">
                    <div>
                      <p className="font-bold font-mono text-white/80">ORD-{ord.id}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{ord.provider} | {new Date(ord.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-white">{currencySymbol}{ord.amount.toLocaleString()}</p>
                      <span className={`text-[8px] font-bold uppercase mt-1 inline-block ${
                        ord.status === 'confirmed' 
                          ? 'text-emerald-400' 
                          : ord.status === 'refunded'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}>{ord.status}</span>
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
