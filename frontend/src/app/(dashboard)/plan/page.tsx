"use client"
import { useState } from "react"
import { Send, Map, Calendar, Wallet } from "lucide-react"

export default function PlanPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your Autopilot AI. Where would you like to go, and what's your budget?"
    }
  ])
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setMessages([...messages, { role: "user", content: input }])
    setInput("")
    
    // Placeholder for actual API call that would trigger LangGraph streaming
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm analyzing your request. I'll search for flights, hotels, and create an itinerary for you." 
      }])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full pt-8 px-4">
      
      {/* Header Tags */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Map className="w-3.5 h-3.5" /> Destination
        </div>
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5" /> Dates
        </div>
        <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
          <Wallet className="w-3.5 h-3.5" /> Budget
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-none">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-secondary text-foreground'
            }`}>
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-6 left-0 right-0 bg-background/80 backdrop-blur-xl pb-6 pt-2">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. I have ₹40,000 for a 5 day beach trip to Goa in December..."
            className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-[15px]"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
          Autopilot can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  )
}
