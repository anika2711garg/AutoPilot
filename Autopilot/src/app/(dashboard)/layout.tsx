import { Sidebar } from "@/components/layout/sidebar"
import { RightPanel } from "@/components/layout/right-panel"
import { BottomDock } from "@/components/layout/bottom-dock"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-[#050816] text-white overflow-hidden relative selection:bg-indigo-500/30">
      {/* Visual background grids & radial glows matching the landing page */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%),linear-gradient(to_bottom,rgba(5,8,22,0.6),rgba(5,8,22,0.95))] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20 pointer-events-none z-0" />

      <div className="relative z-10 flex h-full w-full overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Center Content */}
        <main className="flex-1 relative flex flex-col h-full border-l border-r border-white/5">
          <div className="flex-1 overflow-y-auto pb-24">
              {children}
          </div>
          
          {/* Bottom Dock overlaid on center */}
          <div className="absolute bottom-0 left-0 w-full z-10">
              <BottomDock />
          </div>
        </main>

        {/* Right Panel for Agent Activity */}
        <RightPanel />
      </div>
    </div>
  )
}
