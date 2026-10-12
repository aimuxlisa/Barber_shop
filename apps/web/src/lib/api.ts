import { useCallback, useEffect, useState } from "react";

/* ─── Types (mirror GET /api/v1 responses) ─────────────────────── */

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

/* ─── Base URL ─────────────────────────────────────────────────── */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!res.ok) {
    let code: string | undefined;
    try {
      code = (await res.json() as { code?: string }).code;
    } catch {
      code = undefined;
    }
    throw new ApiError(`Request failed with status ${res.status}.`, res.status, code);
  }
  return (await res.json()) as T;
}

export function fetchServices(): Promise<ApiService[]> {
  return request<ApiService[]>("/api/v1/services");
}

export function fetchBarbers(): Promise<ApiBarber[]> {
  return request<ApiBarber[]>("/api/v1/barbers");
}

/* ─── Availability & Booking API ─────────────────────────────── */

export interface AvailabilitySlot {
  time: string; // HH:MM
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
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

export interface CreateBookingInput {
  serviceIds: string[];
  barberId: string;
  startsAt: string;
  client: {
    name: string;
    phone: string;
  };
}

export function fetchAvailability(params: {
  serviceIds: string[];
  barberId: string;
  date: string;
}): Promise<AvailabilityResponse> {
  const query = new URLSearchParams();
  params.serviceIds.forEach((id) => query.append("serviceIds", id));
  query.set("barberId", params.barberId);
  query.set("date", params.date);
  return request<AvailabilityResponse>(`/api/v1/availability?${query.toString()}`);
}

export function fetchAvailabilityDays(params: {
  serviceIds: string[];
  barberId: string;
}): Promise<AvailabilityDaysResponse> {
  const query = new URLSearchParams();
  params.serviceIds.forEach((id) => query.append("serviceIds", id));
  query.set("barberId", params.barberId);
  return request<AvailabilityDaysResponse>(`/api/v1/availability/days?${query.toString()}`);
}

export async function createBookingRequest(input: CreateBookingInput): Promise<BookingResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!res.ok) {
    let code: string | undefined;
    let message = "Failed to create booking.";
    try {
      const data = (await res.json()) as { code?: string; message?: string };
      code = data.code;
      if (data.message) message = data.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as BookingResponse;
}

export function fetchBookingByToken(token: string): Promise<BookingResponse> {
  return request<BookingResponse>(`/api/v1/bookings/${token}`);
}

export async function cancelBookingRequest(token: string): Promise<BookingResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/bookings/${token}/cancel`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!res.ok) {
    let code: string | undefined;
    let message = "Failed to cancel booking.";
    try {
      const data = (await res.json()) as { code?: string; message?: string };
      code = data.code;
      if (data.message) message = data.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as BookingResponse;
}

export async function rescheduleBookingRequest(
  token: string,
  startsAt: string,
): Promise<BookingResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/bookings/${token}/reschedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ startsAt }),
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!res.ok) {
    let code: string | undefined;
    let message = "Failed to reschedule booking.";
    try {
      const data = (await res.json()) as { code?: string; message?: string };
      code = data.code;
      if (data.message) message = data.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as BookingResponse;
}

/* ─── Loading hook ───────────────────────────────────────────── */

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useResource<T>(loader: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError("Could not load data. Check your connection and try again.");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loader, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { data, loading, error, retry };
}

export function useServices(): Resource<ApiService[]> {
  return useResource(fetchServices);
}

export function useBarbers(): Resource<ApiBarber[]> {
  return useResource(fetchBarbers);
}

/* ─── Presentation helpers ───────────────────────────────────── */

export function formatPriceUZS(price: number): string {
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
}

export function formatDurationMin(durationMin: number): string {
  return `${durationMin} min`;
}

export function formatServiceMeta(service: Pick<ApiService, "durationMin" | "price">): string {
  return `${formatDurationMin(service.durationMin)} · ${formatPriceUZS(service.price)}`;
}

export function serviceIndex(position: number): string {
  return String(position + 1).padStart(2, "0");
}

/** Static photo assets keyed by service name. The catalogue itself comes from the API. */
const SERVICE_IMAGES: Record<string, string> = {
  "Classic cut": "/images/svc-cut.jpg",
  "Signature fade": "/images/svc-fade.jpg",
  "Beard design": "/images/svc-beard.jpg",
  "Royal shave": "/images/svc-shave.jpg",
  "Full grooming": "/images/svc-full.jpg",
};

export function serviceImageFor(name: string): string {
  return SERVICE_IMAGES[name] ?? "/images/svc-cut.jpg";
}
