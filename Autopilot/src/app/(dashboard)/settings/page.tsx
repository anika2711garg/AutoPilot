"use client"
import { useState } from "react"
import { Settings, Shield, Key, CreditCard, Check } from "lucide-react"

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("••••••••••••••••••••••••")
  const [anthropicKey, setAnthropicKey] = useState("••••••••••••••••••••••••")
  const [razorpayKey, setRazorpayKey] = useState("rzp_test_••••••••••••••••")
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" /> Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Configure your LLM providers, payment gateway sandboxes, and compliance settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Credentials */}
        <div className="rounded-3xl border border-white/5 bg-[#090d1a]/20 p-6 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3">
            <Key className="w-4 h-4 text-cyan-400" /> API Keys & LLM Providers
          </h2>
          
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">OpenAI API Key (GPT-4o planning reasoning)</label>
              <input 
                type="password" 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">Anthropic API Key (Claude Sonnet agent supervisor)</label>
              <input 
                type="password" 
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" 
              />
            </div>
          </div>
        </div>

        {/* Payment Sandboxes */}
        <div className="rounded-3xl border border-white/5 bg-[#090d1a]/20 p-6 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3">
            <CreditCard className="w-4 h-4 text-indigo-400" /> Gateway Credentials (India Region)
          </h2>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/70">Razorpay Key ID (Strategy A/B checkout sandbox)</label>
            <input 
              type="text" 
              value={razorpayKey}
              onChange={(e) => setRazorpayKey(e.target.value)}
              className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50" 
            />
          </div>
        </div>

        {/* Travel Compliance Policies */}
        <div className="rounded-3xl border border-white/5 bg-[#090d1a]/20 p-6 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3">
            <Shield className="w-4 h-4 text-purple-400" /> Compliance & Privacy
          </h2>
          
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p>
              <strong>India DPDP Act / GDPR:</strong> Collected traveler information is encrypted at rest. PII data is stripped prior to sending requests to external LLM provider endpoints.
            </p>
            <p>
              <strong>Saga Compensation Limits:</strong> Rollback triggers automatically verify voids against flight ticket rules. Non-refundable segments require explicit user opt-in before saga payment execution.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          {isSaved && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4" /> Credentials saved locally!
            </span>
          )}
          
          <button 
            type="submit"
            className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl shadow-lg hover:bg-white/90 transition-all cursor-pointer"
          >
            Save Configuration
          </button>
        </div>

      </form>
    </div>
  )
}
