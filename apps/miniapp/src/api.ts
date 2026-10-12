export interface ApiService {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
}

export interface ApiBarber {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  experienceYears: number;
}

export interface AvailabilitySlot {
  time: string;
  startsAt: string;
  endsAt: string;
  barberId: string;
}

export interface AvailabilityResponse {
  date: string;
  barberId: string;
  slots: AvailabilitySlot[];
  totalDurationMin: number;
  totalPrice: number;
}

export interface AvailabilityDaysResponse {
  barberId: string;
  serviceIds: string[];
  days: {
    date: string;
    hasSlots: boolean;
  }[];
}

export interface BookingResponse {
  id: string;
  barberId: string;
  startsAt: string;
  endsAt: string;
  totalPrice: number;
  totalDurationMin: number;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  source: "web" | "telegram" | "admin";
  manageToken: string;
  createdAt: string;
  barber: {
    id: string;
    name: string;
    photoUrl: string;
  };
  client: {
    id: string;
    name: string;
    phone: string;
  };
  services: {
    serviceId: string;
    name: string;
    durationMin: number;
    price: number;
  }[];
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  telegramId?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    initData?: string;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.initData) {
    headers["X-Telegram-Init-Data"] = options.initData;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options?.method || "GET",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Could not connect to the API server.");
  }

  if (!res.ok) {
    let errorData: { code?: string; message?: string } = {};
    try {
      errorData = (await res.json()) as { code?: string; message?: string };
    } catch {
      // ignore
    }
    const err = new Error(errorData.message || `Request failed with status ${res.status}`);
    (err as unknown as { code?: string; status?: number }).code = errorData.code;
    (err as unknown as { code?: string; status?: number }).status = res.status;
    throw err;
  }

  return (await res.json()) as T;
}

export function getServices() {
  return apiRequest<ApiService[]>("/api/v1/services");
}

export function getBarbers() {
  return apiRequest<ApiBarber[]>("/api/v1/barbers");
}

export function getAvailability(params: { serviceIds: string[]; barberId: string; date: string }) {
  const query = new URLSearchParams();
  params.serviceIds.forEach((id) => query.append("serviceIds", id));
  query.set("barberId", params.barberId);
  query.set("date", params.date);
  return apiRequest<AvailabilityResponse>(`/api/v1/availability?${query.toString()}`);
}

export function getAvailabilityDays(params: { serviceIds: string[]; barberId: string }) {
  const query = new URLSearchParams();
  params.serviceIds.forEach((id) => query.append("serviceIds", id));
  query.set("barberId", params.barberId);
  return apiRequest<AvailabilityDaysResponse>(`/api/v1/availability/days?${query.toString()}`);
}

export function createBooking(data: {
  serviceIds: string[];
  barberId: string;
  startsAt: string;
  client: { name: string; phone: string };
  initData?: string;
}) {
  return apiRequest<BookingResponse>("/api/v1/bookings", {
    method: "POST",
    body: {
      serviceIds: data.serviceIds,
      barberId: data.barberId,
      startsAt: data.startsAt,
      client: data.client,
      source: "telegram",
    },
    initData: data.initData,
  });
}

export function getMyBookings(initData: string) {
  return apiRequest<{ bookings: BookingResponse[] }>("/api/v1/me/bookings", {
    initData,
  });
}

export function cancelBooking(token: string) {
  return apiRequest<BookingResponse>(`/api/v1/bookings/${token}/cancel`, {
    method: "POST",
  });
}

export function rescheduleBooking(token: string, startsAt: string) {
  return apiRequest<BookingResponse>(`/api/v1/bookings/${token}/reschedule`, {
    method: "POST",
    body: { startsAt },
  });
}

export function formatPriceUZS(price: number): string {
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
}

export function formatDurationMin(durationMin: number): string {
  return `${durationMin} min`;
}
