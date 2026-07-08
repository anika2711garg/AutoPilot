import Link from "next/link"
import { Compass, Settings, Bell, Plane, Bookmark, User, Sparkles } from "lucide-react"

const navItems = [
  { icon: Sparkles, label: "Planner", href: "/plan" },
  { icon: Plane, label: "Trips", href: "/trips" },
  { icon: Compass, label: "Explore", href: "/explore" },
  { icon: Bookmark, label: "Saved Plans", href: "/saved" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <Link href="/" className="font-semibold text-lg flex items-center gap-2 tracking-tight">
          <Plane className="w-5 h-5 text-indigo-500" />
          Autopilot
        </Link>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>
      
      <div className="p-4 border-t border-border/50">
        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 transition-all text-left">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs text-muted-foreground truncate">user@example.com</p>
          </div>
        </button>
      </div>
    </aside>
  )
}
