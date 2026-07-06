import { MapPin, CalendarDays, Wallet, CloudSun, Phone, PenTool } from "lucide-react"

export default function TripDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-full w-full">
      {/* Left Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Goa Getaway</h1>
          <div className="flex gap-4 text-muted-foreground font-medium text-sm">
            <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full"><MapPin className="w-4 h-4"/> Goa, India</span>
            <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full"><CalendarDays className="w-4 h-4"/> Dec 15 - Dec 20</span>
            <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full"><Wallet className="w-4 h-4"/> ₹38,500</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Itinerary</h2>
            
            {/* Day 1 */}
            <div className="bg-secondary/20 border border-border/50 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-indigo-400">Day 1: Arrival & North Goa</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border/50">
                
                {/* Flight Event */}
                <div className="relative flex items-start gap-4">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-indigo-500 mt-0.5"></div>
                  <div>
                    <p className="font-medium">Flight Indigo 6E-243</p>
                    <p className="text-sm text-muted-foreground">10:00 AM - DEL to GOI</p>
                  </div>
                </div>

                {/* Hotel Event */}
                <div className="relative flex items-start gap-4">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-border mt-0.5"></div>
                  <div>
                    <p className="font-medium">Check-in at Taj Fort Aguada</p>
                    <p className="text-sm text-muted-foreground">2:00 PM</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Widgets Column */}
          <div className="col-span-1 space-y-6">
            {/* Weather Widget */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <CloudSun className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">28°C</span>
              </div>
              <p className="font-medium">Sunny & Clear</p>
              <p className="text-sm opacity-80">Perfect beach weather</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-secondary/20 border border-border/50 rounded-2xl p-4 space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-medium text-left">
                <Phone className="w-4 h-4 text-muted-foreground" /> Emergency Contacts
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-sm font-medium text-left">
                <PenTool className="w-4 h-4 text-muted-foreground" /> Trip Notes
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Right Map Panel (Placeholder for Mapbox) */}
      <div className="w-1/3 border-l border-border/50 bg-secondary/10 relative hidden xl:block">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-sm">
          [Interactive Mapbox Area]
        </div>
      </div>
    </div>
  )
}
