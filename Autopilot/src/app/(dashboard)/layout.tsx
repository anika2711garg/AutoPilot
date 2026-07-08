"use client"
import { useState } from "react"
import { Menu, Terminal, X, Landmark } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { RightPanel } from "@/components/layout/right-panel"
import { BottomDock } from "@/components/layout/bottom-dock"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)

  return (
    <div className="flex h-screen w-full bg-[#050816] text-white overflow-hidden relative selection:bg-indigo-500/30">
      {/* Visual background grids & radial glows matching the landing page */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%),linear-gradient(to_bottom,rgba(5,8,22,0.6),rgba(5,8,22,0.95))] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20 pointer-events-none z-0" />

      <div className="relative z-10 flex h-full w-full overflow-hidden">
        
        {/* Left Sidebar - Desktop (shows md and up) */}
        <div className="hidden md:flex shrink-0 h-full">
          <Sidebar />
        </div>

        {/* Left Sidebar - Mobile Drawer */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            
            {/* Drawer Body */}
            <div className="relative flex flex-col w-64 h-full bg-[#050816] border-r border-white/10 animate-in slide-in-from-left duration-200">
              <div className="absolute right-4 top-4 z-50">
                <button onClick={() => setIsSidebarOpen(false)} className="text-white/60 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar />
            </div>
          </div>
        )}
        
        {/* Center Content Column */}
        <main className="flex-1 relative flex flex-col h-full border-l border-r border-white/5 overflow-hidden">
          
          {/* Mobile Top Navigation Header */}
          <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-slate-950/20 backdrop-blur-md md:hidden shrink-0">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white/70 hover:text-white p-1 cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 shadow">
                <Landmark className="h-4 w-4 text-indigo-300" />
              </div>
              <span className="text-sm font-bold">Autopilot</span>
            </Link>

            <button onClick={() => setIsRightPanelOpen(true)} className="text-white/70 hover:text-white p-1 cursor-pointer">
              <Terminal className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto pb-24">
              {children}
          </div>
          
          {/* Bottom Dock overlaid on center */}
          <div className="absolute bottom-0 left-0 w-full z-10 no-print">
              <BottomDock />
          </div>
        </main>

        {/* Right Panel - Desktop (shows lg and up) */}
        <div className="hidden lg:flex shrink-0 h-full">
          <RightPanel />
        </div>

        {/* Right Panel - Mobile Drawer */}
        {isRightPanelOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden justify-end">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRightPanelOpen(false)} />
            
            {/* Drawer Body */}
            <div className="relative flex flex-col w-80 h-full bg-[#050816] border-l border-white/10 animate-in slide-in-from-right duration-200">
              <div className="absolute left-4 top-4 z-50">
                <button onClick={() => setIsRightPanelOpen(false)} className="text-white/60 hover:text-white p-1 bg-slate-950/80 border border-white/10 rounded-lg cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RightPanel />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
