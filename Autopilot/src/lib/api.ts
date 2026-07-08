const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export type Trip = {
  id: number;
  title: string;
  destination: string;
  dates: string;
  budget: string;
  status: string;
  summary: string;
};

export type DetailedTrip = Trip & {
  currency: string;
  budget_val: number;
  estimated_cost: string;
  estimated_cost_val: number;
  preferences: {
    vibe?: string;
    budget_allocation?: Record<string, number>;
    local_info?: {
      weather?: {
        temp: string;
        condition: string;
        desc: string;
      };
      currency?: {
        name: string;
        rate: string;
      };
      safety?: string;
      visa?: string;
    };
    packing_list?: Array<{
      item: string;
      category: string;
      packed: boolean;
    }>;
  };
  plan?: {
    itinerary?: Array<{
      day: number;
      title: string;
      events: Array<{
        title: string;
        time: string;
        desc: string;
        lat: number;
        lng: number;
      }>;
    }>;
    flights?: any[];
    hotels?: any[];
    activities?: any[];
  };
  segments?: Array<{
    id: number;
    kind: string;
    provider: string;
    provider_ref: string;
    price: number;
    status: string;
    payload: any;
  }>;
  orders?: Array<{
    id: number;
    status: string;
    provider: string;
    amount: number;
    created_at: string;
  }>;
  events?: Array<{
    id: number;
    type: string;
    data: any;
    at: string;
  }>;
};

export type TripSummary = {
  active_trips: number;
  planning_ready: boolean;
  favorite_destinations: string[];
  quick_tips: string[];
};

export type TripCreateResponse = {
  assistant_message: string;
  trip: Trip;
  next_steps: string[];
  recommendations: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function getTrips() {
  return request<Trip[]>("/trips");
}

export async function getTripSummary() {
  return request<TripSummary>("/trips/summary");
}

export async function getTrip(tripId: string) {
  return request<DetailedTrip>(`/trips/${tripId}`);
}

export async function createTrip(prompt: string) {
  return request<TripCreateResponse>("/trips", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function reoptimizeTrip(tripId: number, budget: number, allocations: Record<string, number>) {
  return request<{ message: string }>(`/trips/${tripId}/reoptimize`, {
    method: "POST",
    body: JSON.stringify({ budget, allocations }),
  });
}

export async function priceCheckTrip(tripId: number) {
  return request<{ price_drift: boolean; delta: number; new_total: number }>(`/trips/${tripId}/price-check`, {
    method: "POST",
  });
}

export async function approveTripPlan(tripId: number) {
  return request<{ status: string }>(`/trips/${tripId}/approve`, {
    method: "POST",
  });
}

export async function bookTrip(tripId: number, simulationMode: string) {
  return request<{ status: string; message: string }>(`/trips/${tripId}/book`, {
    method: "POST",
    body: JSON.stringify({ simulation_mode: simulationMode }),
  });
}

export async function cancelTrip(tripId: number) {
  return request<{ status: string }>(`/trips/${tripId}/cancel`, {
    method: "POST",
  });
}
