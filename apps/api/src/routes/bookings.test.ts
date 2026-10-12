import { config } from "dotenv";
import { resolve } from "node:path";

config();
config({ path: resolve(process.cwd(), "../../.env") });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@barbershop/db";
import { buildApp } from "../server";
import type { FastifyInstance } from "fastify";
import { addDays, toWall, timeToMinutes } from "../lib/time";

const PHONES = ["+998901112201", "+998901112202", "+998901112203"];

let app: FastifyInstance;
let serviceId: string;
let serviceDurationMin: number;
let servicePrice: number;
let barberId: string;
let targetDate: string;

function startsAtIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const minutes = timeToMinutes(time);
  // Asia/Tashkent is UTC+5.
  return new Date(Date.UTC(year, month - 1, day, 0, minutes) - 5 * 3_600_000).toISOString();
}

async function cleanup() {
  await prisma.booking.deleteMany({
    where: { client: { phone: { in: PHONES } } },
  });
  await prisma.client.deleteMany({ where: { phone: { in: PHONES } } });
}

beforeAll(async () => {
  app = await buildApp();

  const service = await prisma.service.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const barber = await prisma.barber.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!service || !barber) throw new Error("Seed data is missing: run db:seed first.");
  serviceId = service.id;
  serviceDurationMin = service.durationMin;
  servicePrice = service.price;
  barberId = barber.id;

  // An open weekday (shop is closed on Monday) inside the horizon.
  const today = toWall(new Date()).date;
  for (let i = 2; i <= 20; i++) {
    const candidate = addDays(today, i);
    // Verify against the API instead of assuming weekday rules.
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${candidate}`,
    });
    if (res.statusCode === 200) {
      const body = res.json() as { slots: string[] };
      if (body.slots.length >= 4) {
        targetDate = candidate;
        break;
      }
    }
  }
  if (!targetDate) throw new Error("No open day with free slots found in the horizon.");

  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

async function firstSlot(): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${targetDate}`,
  });
  const body = res.json() as { slots: string[] };
  if (body.slots.length === 0) throw new Error("Expected free slots on the target date.");
  return body.slots[0];
}

function createPayload(startsAt: string, phone: string, barber: string = barberId) {
  return {
    serviceIds: [serviceId],
    barberId: barber,
    startsAt,
    client: { name: "Stage5 Test", phone },
  };
}

describe("bookings", () => {
  it("creates a booking with computed totals", async () => {
    const slot = await firstSlot();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAtIso(targetDate, slot), PHONES[0]),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      manageToken: string;
      totalDurationMin: number;
      totalPrice: number;
      startsAt: string;
      endsAt: string;
      status: string;
    };
    expect(body.manageToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.totalDurationMin).toBe(serviceDurationMin);
    expect(body.totalPrice).toBe(servicePrice);
    expect(body.status).toBe("confirmed");
    expect(
      new Date(body.endsAt).getTime() - new Date(body.startsAt).getTime(),
    ).toBe(serviceDurationMin * 60_000);
  });

  it("rejects a double booking of the same slot with 409 SLOT_TAKEN", async () => {
    const slot = await firstSlot();
    const startsAt = startsAtIso(targetDate, slot);
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAt, PHONES[1]),
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAt, PHONES[2]),
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("assigns a barber in any-mode", async () => {
    const slot = await firstSlot();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAtIso(targetDate, slot), PHONES[0], "any"),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { barber: { id: string; name: string } };
    expect(body.barber.id).not.toBe("any");
    expect(body.barber.name.length).toBeGreaterThan(0);
  });

  it("reads, reschedules and cancels by manage token", async () => {
    const slot = await firstSlot();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAtIso(targetDate, slot), PHONES[1]),
    });
    expect(created.statusCode).toBe(201);
    const { manageToken } = created.json() as { manageToken: string };

    const fetched = await app.inject({ method: "GET", url: `/api/v1/bookings/${manageToken}` });
    expect(fetched.statusCode).toBe(200);

    const slotsRes = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${targetDate}`,
    });
    const slots = (slotsRes.json() as { slots: string[] }).slots;
    const other = slots.find((s) => s !== slot);
    if (!other) throw new Error("Need at least two free slots for the reschedule test.");

    const moved = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${manageToken}/reschedule`,
      payload: { startsAt: startsAtIso(targetDate, other) },
    });
    expect(moved.statusCode).toBe(200);
    expect((moved.json() as { startsAt: string }).startsAt).toBe(startsAtIso(targetDate, other));

    const cancelled = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${manageToken}/cancel`,
    });
    expect(cancelled.statusCode).toBe(200);
    expect((cancelled.json() as { status: string }).status).toBe("cancelled");

    // Cancelling twice stays a success (idempotent).
    const again = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${manageToken}/cancel`,
    });
    expect(again.statusCode).toBe(200);
  });

  it("rejects rescheduling into a taken slot with 409", async () => {
    const slot = await firstSlot();
    const taken = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAtIso(targetDate, slot), PHONES[2]),
    });
    expect(taken.statusCode).toBe(201);

    const slotsRes = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${targetDate}`,
    });
    const slots = (slotsRes.json() as { slots: string[] }).slots;
    const other = slots.find((s) => s !== slot);
    if (!other) throw new Error("Need at least two free slots for the reschedule test.");
    const movable = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: createPayload(startsAtIso(targetDate, other), PHONES[0]),
    });
    expect(movable.statusCode).toBe(201);
    const { manageToken } = movable.json() as { manageToken: string };

    const clash = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${manageToken}/reschedule`,
      payload: { startsAt: startsAtIso(targetDate, slot) },
    });
    expect(clash.statusCode).toBe(409);
    expect(clash.json()).toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("lets exactly one of two parallel requests win the slot", async () => {
    const slot = await firstSlot();
    const startsAt = startsAtIso(targetDate, slot);
    const [a, b] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        payload: createPayload(startsAt, PHONES[0]),
      }),
      app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        payload: createPayload(startsAt, PHONES[1]),
      }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
    const loser = a.statusCode === 409 ? a : b;
    expect(loser.json()).toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("marks days without working hours as slotless", async () => {
    const today = toWall(new Date()).date;
    let monday = "";
    for (let i = 0; i < 14; i++) {
      const candidate = addDays(today, i);
      if (toWall(new Date(candidate + "T00:00:00Z")).weekdayIso === 1) {
        monday = candidate;
        break;
      }
    }
    expect(monday).not.toBe("");
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/availability/days?serviceIds=${serviceId}&barberId=${barberId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { days: Array<{ date: string; hasSlots: boolean }> };
    expect(body.days.length).toBeGreaterThan(0);
    const mondayEntry = body.days.find((d) => d.date === monday);
    expect(mondayEntry?.hasSlots).toBe(false);
    const targetEntry = body.days.find((d) => d.date === targetDate);
    expect(targetEntry?.hasSlots).toBe(true);
  });

  it("validates availability input", async () => {
    const badDate = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=bad`,
    });
    expect(badDate.statusCode).toBe(400);

    const badService = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=00000000-0000-4000-8000-000000000000&barberId=${barberId}&date=${targetDate}`,
    });
    expect(badService.statusCode).toBe(422);

    const badBooking = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      payload: { serviceIds: [], barberId, startsAt: new Date().toISOString(), client: { name: "", phone: "x" } },
    });
    expect(badBooking.statusCode).toBe(400);
  });
});
