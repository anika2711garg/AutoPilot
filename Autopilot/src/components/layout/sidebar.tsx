"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Settings, Bell, Plane, Bookmark, User, Sparkles, Landmark } from "lucide-react"

const navItems = [
  { icon: Sparkles, label: "Planner", href: "/plan" },
  { icon: Plane, label: "Trips", href: "/trips" },
  { icon: Compass, label: "Explore", href: "/explore" },
  { icon: Bookmark, label: "Saved Plans", href: "/saved" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-white/5 bg-slate-950/20 backdrop-blur-xl flex flex-col hidden md:flex relative z-20">
      
      {/* Brand Header matching Landing Page */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight text-white hover:opacity-90 transition-all">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-indigo-500/10">
            <Landmark className="h-4.5 w-4.5 text-indigo-300" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Autopilot</span>
        </Link>
      </div>
      
      {/* Navigation Links with Active States */}
      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          // Check if active path matches item.href
          const isActive = pathname === item.href || (item.href !== "/plan" && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border-l-2 ${
                isActive 
                  ? 'border-indigo-500 bg-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]' 
                  : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-current'}`} />
              {item.label}
            </Link>
          )
        })}
      </div>
      
      {/* User Section */}
      <div className="p-4 border-t border-white/5">
        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/5 transition-all text-left group">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-500/50 transition-colors">
            <User className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">User Name</p>
            <p className="text-[10px] text-white/40 truncate">user@example.com</p>
          </div>
        </button>
      </div>
    </aside>
  )
}
