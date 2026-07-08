"use client"
import { Bell, CheckCircle, Info, RefreshCw, ChevronRight } from "lucide-react"

export default function NotificationsPage() {
  const mockNotifications = [
    {
      id: 1,
      type: "success",
      title: "Booking Saga Completed",
      message: "Trip #1 to Goa, India has been successfully confirmed on all GDS legs. Flights and hotel check-in receipts are ready.",
      time: "2 hours ago"
    },
    {
      id: 2,
      type: "info",
      title: "Orchestration Pipeline Complete",
      message: "The supervisor agent successfully reconciled the budget splits and assembled the itinerary blueprint for Trip #1.",
      time: "3 hours ago"
    },
    {
      id: 3,
      type: "rollback",
      title: "Compensating Saga Initiated",
      message: "Hotelbeds reported sold-out inventory on Taj Fort Aguada. Saga executor voided Indigo 6E-243 flight reservation and credited refund.",
      time: "1 day ago"
    }
  ]

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-indigo-400" /> Notifications
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Real-time alerts relating to transaction rollbacks, refunds, and planning outcomes.</p>
      </div>

      <div className="space-y-3">
        {mockNotifications.map((notif) => (
          <div 
            key={notif.id}
            className="p-4 rounded-2xl border border-white/5 bg-[#090d1a]/20 flex gap-4 items-start hover:bg-slate-900/30 transition-all"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              notif.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : notif.type === 'rollback'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {notif.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {notif.type === 'info' && <Info className="w-4 h-4" />}
              {notif.type === 'rollback' && <RefreshCw className="w-4 h-4" />}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-sm font-bold text-white">{notif.title}</h3>
                <span className="text-[10px] text-muted-foreground font-mono">{notif.time}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
