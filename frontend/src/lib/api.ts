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

export async function getTrip(tripId: string) {
  return request<Trip>(`/trips/${tripId}`);
}

export async function createTrip(prompt: string) {
  return request<{ assistant_message: string; trip: Trip }>("/trips", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
