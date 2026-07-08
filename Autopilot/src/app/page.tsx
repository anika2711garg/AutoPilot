import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Globe, Landmark, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";

const stats = [
  { value: "24h", label: "Average itinerary turnaround" },
  { value: "18k", label: "Trips planned with the copilot" },
  { value: "94%", label: "Users who kept the first draft" },
];

const features = [
  {
    icon: Globe,
    title: "Search everything together",
    description:
      "Flights, stays, transit, and activities are compared in one flow instead of scattered across tabs.",
  },
  {
    icon: Sparkles,
    title: "Clear next actions",
    description:
      "Each trip gets a clean plan with budgets, timing, and decisions surfaced up front.",
  },
  {
    icon: ShieldCheck,
    title: "Built for trust",
    description:
      "Important choices stay visible, so travelers can verify details before booking.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell Autopilot where you want to go",
    description: "Describe your destination, dates, and budget in plain language.",
  },
  {
    number: "02",
    title: "Let the agents work in parallel",
    description: "The system scouts flights, stays, and timing while the budget gets optimized.",
  },
  {
    number: "03",
    title: "Refine and book with confidence",
    description: "Review a focused itinerary instead of a pile of raw search results.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%),linear-gradient(to_bottom,rgba(5,8,22,0.5),rgba(5,8,22,0.95))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[72px_72px] opacity-25" />

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050816]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-lg shadow-indigo-500/10">
              <Landmark className="h-4 w-4 text-indigo-300" />
            </div>
            <span className="text-lg">Autopilot</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <Link href="/plan" className="transition hover:text-white">Planner</Link>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-indigo-200 shadow-lg shadow-indigo-500/10 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Multi-agent travel planning, live in beta
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Plan, compare, and book trips with a calmer interface.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66 sm:text-xl">
              Autopilot turns a messy travel search into a focused plan. Flights, stays, budget, and itinerary decisions come together in one place so travelers can move faster and decide with confidence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-medium text-black transition hover:bg-white/90">
                Start planning for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/plan" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 font-medium text-white transition hover:bg-white/10">
                See the planner
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
                  <div className="mt-1 text-sm leading-6 text-white/55">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-indigo-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1122]/85 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between text-sm text-white/55">
                <span>Trip control center</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Ready
                </span>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/55">Next recommended trip</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Goa Escape</h2>
                  </div>
                  <div className="rounded-2xl bg-indigo-400/15 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Budget</p>
                    <p className="text-lg font-semibold text-white">₹38,500</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-indigo-300" />
                      <span className="text-sm text-white/75">Dec 15 - Dec 20</span>
                    </div>
                    <span className="text-sm text-white/45">5 days</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-cyan-300" />
                      <span className="text-sm text-white/75">Flight + hotel options matched</span>
                    </div>
                    <span className="text-sm text-white/45">14 results</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-linear-to-br from-indigo-500/20 to-cyan-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">Agent output</p>
                      <p className="mt-1 font-medium">Best-value itinerary assembled</p>
                    </div>
                    <Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    Flight options, a stay near the beach, and a balanced budget plan are already organized for review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A cleaner way to explore travel plans</h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-white/60">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="mt-24 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Simple for travelers, structured for the agents</h2>
            <p className="mt-4 max-w-xl text-white/60 leading-7">
              The interface stays lightweight while the backend keeps the planning pipeline organized. That gives users a quick path from idea to actionable itinerary.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-indigo-200">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 leading-7 text-white/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
