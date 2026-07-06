export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10" />
      
      <header className="fixed top-0 w-full border-b border-white/10 bg-black/50 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tighter">Autopilot</div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-white transition">How it Works</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </nav>
          <div className="flex gap-4">
            <a href="/login" className="text-sm font-medium hover:text-white/80 px-4 py-2">Sign in</a>
            <a href="/plan" className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-white/90 transition">
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-16 container mx-auto px-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-indigo-300 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          Autopilot Beta is now live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl leading-[1.1] mb-6">
          Plan, optimize, and book trips <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            with an AI Copilot.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-10">
          Autopilot uses a multi-agent AI architecture to search flights, find hotels, build itineraries, and manage your budget—all through a simple natural language interface.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <a href="/plan" className="w-full bg-white text-black h-12 rounded-xl flex items-center justify-center font-medium hover:bg-white/90 transition shadow-[0_0_40px_rgba(255,255,255,0.3)]">
            Start Planning
          </a>
        </div>
        
        {/* Globe Placeholder */}
        <div className="mt-20 w-full max-w-5xl aspect-video rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden backdrop-blur-sm flex items-center justify-center">
            <div className="text-white/40 font-mono text-sm">[Interactive Globe Animation Here]</div>
        </div>
      </main>
    </div>
  )
}
