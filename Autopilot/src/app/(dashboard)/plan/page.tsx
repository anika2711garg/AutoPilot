"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Lightbulb, Send, Sparkles, Map, Calendar, Wallet } from "lucide-react"
import { createTrip, getApiBaseUrl, getTripSummary, getTrips, type Trip, type TripSummary } from "@/lib/api"

type Message = {
  role: "assistant" | "user"
  content: string
}

export default function PlanPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Autopilot AI. Where would you like to go, and what's your budget?"
    }
  ])
  const [input, setInput] = useState("")
  const [trips, setTrips] = useState<Trip[]>([])
  const [summary, setSummary] = useState<TripSummary | null>(null)
  const [isLoadingTrips, setIsLoadingTrips] = useState(true)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoadingTrips(true)
    setIsLoadingSummary(true)
    getTrips()
      .then(setTrips)
      .catch(() => setError("Could not load trips from the backend right now."))
      .finally(() => setIsLoadingTrips(false))

    getTripSummary()
      .then(setSummary)
      .catch(() => null)
      .finally(() => setIsLoadingSummary(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const prompt = input.trim()
    setMessages((currentMessages) => [...currentMessages, { role: "user", content: prompt }])
    setInput("")
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createTrip(prompt)
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: result.assistant_message },
      ])
      setTrips((currentTrips) => [result.trip, ...currentTrips])

      if (result.next_steps.length > 0) {
        setMessages((currentMessages) => [
          ...currentMessages,
          { role: "assistant", content: `Next step: ${result.next_steps[0]}` },
        ])
      }
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: "I could not reach the backend just now. Try again in a moment." },
      ])
      setError("Backend request failed. Make sure the FastAPI server is running on port 8000.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const connectedBackend = getApiBaseUrl()

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-8 px-4">
      <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Planner workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Draft trips with backend-backed mock data</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
              Use this workspace to shape trips now. The live data layer can be added later without changing the core planning flow.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            Connected to {connectedBackend}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Trips synced</p>
            <p className="mt-2 text-2xl font-semibold">{isLoadingTrips ? "..." : trips.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Mock mode</p>
            <p className="mt-2 text-2xl font-semibold">Active</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Planner state</p>
            <p className="mt-2 text-2xl font-semibold">{isSubmitting ? "Thinking" : "Ready"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Suggested prompts
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "5 day beach trip to Goa in December",
                "Tokyo city break under $2500",
                "Family weekend in Bali with hotel options",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Lightbulb className="h-4 w-4 text-yellow-300" />
              Quick tips
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/65">
              {isLoadingSummary ? (
                <p>Loading trip guidance...</p>
              ) : summary ? (
                summary.quick_tips.map((tip) => <p key={tip}>• {tip}</p>)
              ) : (
                <p>Include destination, dates, budget, and trip style for a sharper mock plan.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header Tags */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Map className="w-3.5 h-3.5" /> Destination
        </div>
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5" /> Dates
        </div>
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Wallet className="w-3.5 h-3.5" /> Budget
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-none">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-secondary text-foreground'
            }`}>
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-border/50 bg-secondary/20 p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Backend trips</h2>
            <p className="text-xs text-muted-foreground">Your mock backend catalog and newly created trips live here.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {summary ? `${summary.active_trips} active trips` : `${trips.length} trips`}
          </span>
        </div>

        {isLoadingTrips ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-border/50 bg-background/60 p-4">
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="mt-3 h-3 w-40 rounded bg-white/10" />
                <div className="mt-4 h-3 w-full rounded bg-white/10" />
                <div className="mt-2 h-3 w-5/6 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : trips.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {trips.slice(0, 4).map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group rounded-xl border border-border/50 bg-background/60 p-3 transition hover:border-indigo-500/40 hover:bg-background/80"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{trip.title}</p>
                    <p className="text-xs text-muted-foreground">{trip.destination}</p>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">{trip.status}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{trip.summary}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/70 transition group-hover:text-white">
                  Open trip <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
            No trips yet. Use one of the suggestions above to create your first backend-backed plan.
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-6 left-0 right-0 bg-background/80 backdrop-blur-xl pb-6 pt-2">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. I have ₹40,000 for a 5 day beach trip to Goa in December..."
            className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-[15px]"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
          Autopilot can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  )
}
