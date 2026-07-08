import { create } from "zustand"
import { getTrip, reoptimizeTrip, priceCheckTrip, approveTripPlan, bookTrip, cancelTrip, type DetailedTrip } from "./api"

export interface TerminalLog {
  id: number;
  type: string;
  data: {
    agent: string;
    message: string;
    [key: string]: any;
  };
  at: string;
}

interface TravelStore {
  activeTrip: DetailedTrip | null;
  logs: TerminalLog[];
  activeAgent: string;
  isPlanning: boolean;
  isBooking: boolean;
  simulationMode: string;
  budgetAllocations: Record<string, number>;
  priceDrift: { checked: boolean; drift: boolean; delta: number; newTotal: number } | null;
  
  setSimulationMode: (mode: string) => void;
  setBudgetAllocations: (allocs: Record<string, number>) => void;
  loadTrip: (tripId: string) => Promise<void>;
  startSseStream: (tripId: string) => void;
  reoptimize: (tripId: number, budget: number) => Promise<void>;
  checkPrices: (tripId: number) => Promise<void>;
  approvePlan: (tripId: number) => Promise<void>;
  executeBooking: (tripId: number) => Promise<any>;
  cancelTripPlan: (tripId: number) => Promise<void>;
  resetLogs: () => void;
  disconnectSse: () => void;
}

let sseSource: EventSource | null = null;

export const useTravelStore = create<TravelStore>((set, get) => ({
  activeTrip: null,
  logs: [],
  activeAgent: "Supervisor",
  isPlanning: false,
  isBooking: false,
  simulationMode: "success",
  budgetAllocations: { transport: 35, accommodation: 30, food: 15, activities: 12, buffer: 8 },
  priceDrift: null,

  setSimulationMode: (mode) => set({ simulationMode: mode }),
  setBudgetAllocations: (allocs) => set({ budgetAllocations: allocs }),
  resetLogs: () => set({ logs: [], activeAgent: "Supervisor" }),

  disconnectSse: () => {
    if (sseSource) {
      sseSource.close();
      sseSource = null;
    }
  },

  loadTrip: async (tripId) => {
    try {
      const trip = await getTrip(tripId);
      
      // Calculate percentages based on database budget split if it exists
      let allocations = get().budgetAllocations;
      if (trip.preferences?.budget_allocation && trip.budget_val > 0) {
        const dbAlloc = trip.preferences.budget_allocation;
        allocations = {
          transport: Math.round((dbAlloc.transport / trip.budget_val) * 100),
          accommodation: Math.round((dbAlloc.accommodation / trip.budget_val) * 100),
          food: Math.round((dbAlloc.food / trip.budget_val) * 100),
          activities: Math.round((dbAlloc.activities / trip.budget_val) * 100),
          buffer: Math.round((dbAlloc.buffer / trip.budget_val) * 100),
        };
      }

      set({ 
        activeTrip: trip, 
        isPlanning: trip.status.toLowerCase() === "planning",
        budgetAllocations: allocations
      });
      
      // If trip is in planning phase, start SSE
      if (trip.status.toLowerCase() === "planning") {
        get().startSseStream(tripId);
      } else {
        // Just populate static logs from database events
        if (trip.events) {
          const mappedLogs = trip.events.map((e: any) => ({
            id: e.id,
            type: e.type,
            data: e.data,
            at: e.at
          }));
          const lastLog = mappedLogs[mappedLogs.length - 1];
          set({ 
            logs: mappedLogs, 
            activeAgent: lastLog ? lastLog.data.agent || "Supervisor" : "Supervisor" 
          });
        }
      }
    } catch (e) {
      console.error("Failed loading trip", e);
    }
  },

  startSseStream: (tripId) => {
    if (sseSource) {
      sseSource.close();
    }
    
    set({ isPlanning: true, logs: [] });
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
    sseSource = new EventSource(`${apiBase}/api/v1/agents/stream/${tripId}`);
    
    sseSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        set((state) => {
          const exists = state.logs.some(l => l.id === payload.id);
          if (exists) return state;
          
          const newLogs = [...state.logs, payload];
          const activeAgent = payload.data?.agent || state.activeAgent;
          
          return {
            logs: newLogs,
            activeAgent: activeAgent
          };
        });
        
        if (["agent_end", "agent_error", "saga_end", "saga_rollback_completed"].includes(payload.type)) {
          if (sseSource) {
            sseSource.close();
            sseSource = null;
          }
          set({ isPlanning: false });
          get().loadTrip(tripId);
        }
      } catch (e) {
        console.error("Error reading SSE stream item", e);
      }
    };
    
    sseSource.onerror = (e) => {
      console.error("SSE connection error", e);
      if (sseSource) {
        sseSource.close();
        sseSource = null;
      }
      set({ isPlanning: false });
    };
  },

  reoptimize: async (tripId, budget) => {
    set({ isPlanning: true, logs: [] });
    const allocPercent = get().budgetAllocations;
    const absoluteAllocs = {
      transport: Math.round(budget * (allocPercent.transport / 100)),
      accommodation: Math.round(budget * (allocPercent.accommodation / 100)),
      food: Math.round(budget * (allocPercent.food / 100)),
      activities: Math.round(budget * (allocPercent.activities / 100)),
      buffer: Math.round(budget * (allocPercent.buffer / 100)),
    };
    
    await reoptimizeTrip(tripId, budget, absoluteAllocs);
    get().startSseStream(String(tripId));
  },

  checkPrices: async (tripId) => {
    const res = await priceCheckTrip(tripId);
    set({
      priceDrift: {
        checked: true,
        drift: res.price_drift,
        delta: res.delta,
        newTotal: res.new_total
      }
    });
    await get().loadTrip(String(tripId));
  },

  approvePlan: async (tripId) => {
    await approveTripPlan(tripId);
    set({ priceDrift: null });
    await get().loadTrip(String(tripId));
  },

  executeBooking: async (tripId) => {
    set({ isBooking: true });
    try {
      get().startSseStream(String(tripId));
      const res = await bookTrip(tripId, get().simulationMode);
      set({ isBooking: false });
      await get().loadTrip(String(tripId));
      return res;
    } catch (e) {
      set({ isBooking: false });
      throw e;
    }
  },

  cancelTripPlan: async (tripId) => {
    await cancelTrip(tripId);
    set({ priceDrift: null });
    await get().loadTrip(String(tripId));
  }
}));
