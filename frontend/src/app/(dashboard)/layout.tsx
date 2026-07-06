import { Sidebar } from "@/components/layout/sidebar"
import { RightPanel } from "@/components/layout/right-panel"
import { BottomDock } from "@/components/layout/bottom-dock"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar />
      
      {/* Center Content */}
      <main className="flex-1 relative flex flex-col h-full border-l border-r border-border/50">
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
  )
}
