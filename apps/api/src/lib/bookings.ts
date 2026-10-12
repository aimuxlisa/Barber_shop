import { randomUUID } from "node:crypto";
import { prisma } from "@barbershop/db";
import {
  effectiveTotals,
  loadDayBusy,
  loadEligibleSchedules,
  loadRangeBusy,
  loadServicesOrThrow,
  slotsForDate,
  unionSlots,
  type BarberSchedule,
  type DaySlots,
} from "./availability";
import { ApiError, isOverlapDbError } from "./errors";
import { loadSettings, type BookingSettings } from "./settings";
import { addDays, dbTimeToMinutes, minutesToTime, toWall } from "./time";

export type BookingSource = "web" | "telegram" | "admin";

export interface CreateBookingInput {
  serviceIds: string[];
  barberId: string | "any";
  startsAt: Date;
  name: string;
  phone: string;
  source: BookingSource;
}

export interface BookingServiceSnapshot {
  serviceId: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface BookingResult {
  id: string;
  manageToken: string;
  barber: { id: string; name: string };
  client: { name: string; phone: string };
  serviceIds: string[];
  services: BookingServiceSnapshot[];
  startsAt: string;
  endsAt: string;
  totalPrice: number;
  totalDurationMin: number;
  status: string;
  cancellableUntil: string;
}

type BookingWithRelations = {
  id: string;
  manageToken: string;
  startsAt: Date;
  endsAt: Date;
  totalPrice: number;
  totalDurationMin: number;
  status: string;
  barber: { id: string; name: string };
  client: { name: string; phone: string };
  services: Array<{ serviceId: string; name: string; durationMin: number; price: number }>;
};

function shapeBooking(booking: BookingWithRelations, cancelCutoffMin: number): BookingResult {
  return {
    id: booking.id,
    manageToken: booking.manageToken,
    barber: booking.barber,
    client: booking.client,
    serviceIds: booking.services.map((s) => s.serviceId),
    services: booking.services.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      durationMin: s.durationMin,
      price: s.price,
    })),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    totalPrice: booking.totalPrice,
    totalDurationMin: booking.totalDurationMin,
    status: booking.status,
    cancellableUntil: new Date(booking.startsAt.getTime() - cancelCutoffMin * 60_000).toISOString(),
  };
}

const bookingInclude = {
  barber: { select: { id: true, name: true } },
  client: { select: { name: true, phone: true } },
  services: { select: { serviceId: true, name: true, durationMin: true, price: true } },
} as const;

function truncateToMinute(value: Date): Date {
  const copy = new Date(value.getTime());
  copy.setSeconds(0, 0);
  return copy;
}

/** 409 when a confirmed booking overlaps, otherwise 422 outside working hours. */
async function slotBusyError(
  barberId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<ApiError> {
  const clash = await prisma.booking.findFirst({
    where: {
      barberId,
      status: "confirmed",
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (clash) {
    return new ApiError(409, "SLOT_TAKEN", "This slot was just taken. Please choose another time.");
  }
  return new ApiError(
    422,
    "OUTSIDE_WORKING_HOURS",
    "The visit does not fit into working hours. Please choose another time.",
  );
}

export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const settings = await loadSettings();
  const now = new Date();
  const startsAt = truncateToMinute(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new ApiError(400, "INVALID_STARTS_AT", "startsAt must be a valid date.");
  }

  const wall = toWall(startsAt);
  const todayWall = toWall(now);
  if (wall.date < todayWall.date) {
    throw new ApiError(422, "TOO_SOON", "This time is in the past.");
  }
  if (wall.date > addDays(todayWall.date, settings.bookingHorizonDays)) {
    throw new ApiError(422, "TOO_FAR", "Bookings are only open for the coming days.");
  }
  if (startsAt.getTime() < now.getTime() + settings.minNoticeMin * 60_000) {
    throw new ApiError(422, "TOO_SOON", "Bookings need a little lead time. Please choose a later slot.");
  }

  const services = await loadServicesOrThrow(input.serviceIds);
  const schedules = await loadEligibleSchedules(input.serviceIds, input.barberId);
  if (schedules.length === 0) {
    throw new ApiError(422, "NO_ELIGIBLE_BARBER", "No barber performs all selected services.");
  }

  const busy = await loadDayBusy(
    schedules.map((s) => s.barberId),
    wall.date,
  );
  const perBarber = slotsForDate(
    {
      serviceIds: input.serviceIds,
      barberId: input.barberId,
      date: wall.date,
      now,
      settings,
      services,
      schedules,
    },
    busy,
  );

  const startLabel = minutesToTime(wall.minutes);
  let chosen: BarberSchedule;
  if (input.barberId === "any") {
    const match = schedules.find((s) => perBarber.get(s.barberId)?.slots.includes(startLabel));
    if (!match) {
      throw new ApiError(409, "SLOT_TAKEN", "No barber is free at this time. Please choose another time.");
    }
    chosen = match;
  } else {
    chosen = schedules[0];
    const day: DaySlots | undefined = perBarber.get(chosen.barberId);
    if (!day?.slots.includes(startLabel)) {
      const totals = effectiveTotals(services, chosen.overrides);
      const endsAt = new Date(startsAt.getTime() + totals.durationMin * 60_000);
      throw await slotBusyError(chosen.barberId, startsAt, endsAt);
    }
  }

  const totals = effectiveTotals(services, chosen.overrides);
  const endsAt = new Date(startsAt.getTime() + totals.durationMin * 60_000);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const phone = input.phone.trim();
      const name = input.name.trim();
      let client = await tx.client.findFirst({ where: { phone } });
      if (client) {
        if (client.name !== name) {
          client = await tx.client.update({ where: { id: client.id }, data: { name } });
        }
      } else {
        client = await tx.client.create({ data: { name, phone } });
      }

      const booking = await tx.booking.create({
        data: {
          clientId: client.id,
          barberId: chosen.barberId,
          startsAt,
          endsAt,
          totalPrice: totals.price,
          totalDurationMin: totals.durationMin,
          status: "confirmed",
          source: input.source,
          manageToken: randomUUID(),
        },
      });

      await tx.bookingService.createMany({
        data: services.map((service) => ({
          bookingId: booking.id,
          serviceId: service.id,
          name: service.name,
          durationMin: chosen.overrides.get(service.id)?.durationMin ?? service.durationMin,
          price: chosen.overrides.get(service.id)?.price ?? service.price,
        })),
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    });

    return shapeBooking(created, settings.cancelCutoffMin);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isOverlapDbError(error)) {
      throw new ApiError(409, "SLOT_TAKEN", "This slot was just taken. Please choose another time.");
    }
    throw error;
  }
}

export async function getBookingByToken(manageToken: string): Promise<BookingResult> {
  const settings = await loadSettings();
  const booking = await prisma.booking.findUnique({
    where: { manageToken },
    include: bookingInclude,
  });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  return shapeBooking(booking, settings.cancelCutoffMin);
}

function ensureCancellable(booking: { status: string; startsAt: Date }, cancelCutoffMin: number): void {
  if (booking.status === "cancelled") return;
  if (booking.status !== "confirmed") {
    throw new ApiError(422, "BOOKING_NOT_ACTIVE", "Only confirmed bookings can be changed.");
  }
  if (booking.startsAt.getTime() - Date.now() < cancelCutoffMin * 60_000) {
    throw new ApiError(
      422,
      "TOO_LATE",
      "Cancellation and rescheduling close shortly before the visit. Please call us.",
    );
  }
}

export async function cancelBooking(manageToken: string): Promise<BookingResult> {
  const settings = await loadSettings();
  const booking = await prisma.booking.findUnique({
    where: { manageToken },
    include: bookingInclude,
  });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  ensureCancellable(booking, settings.cancelCutoffMin);

  if (booking.status === "cancelled") {
    return shapeBooking(booking, settings.cancelCutoffMin);
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "cancelled" },
    include: bookingInclude,
  });
  return shapeBooking(updated, settings.cancelCutoffMin);
}

export async function rescheduleBooking(
  manageToken: string,
  newStartsAt: Date,
): Promise<BookingResult> {
  const settings = await loadSettings();
  const now = new Date();
  const startsAt = truncateToMinute(newStartsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new ApiError(400, "INVALID_STARTS_AT", "startsAt must be a valid date.");
  }

  const booking = await prisma.booking.findUnique({
    where: { manageToken },
    include: bookingInclude,
  });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  ensureCancellable(booking, settings.cancelCutoffMin);

  const wall = toWall(startsAt);
  const todayWall = toWall(now);
  if (wall.date < todayWall.date) {
    throw new ApiError(422, "TOO_SOON", "This time is in the past.");
  }
  if (wall.date > addDays(todayWall.date, settings.bookingHorizonDays)) {
    throw new ApiError(422, "TOO_FAR", "Bookings are only open for the coming days.");
  }
  if (startsAt.getTime() < now.getTime() + settings.minNoticeMin * 60_000) {
    throw new ApiError(422, "TOO_SOON", "Bookings need a little lead time. Please choose a later slot.");
  }
  if (startsAt.getTime() === booking.startsAt.getTime()) {
    return shapeBooking(booking, settings.cancelCutoffMin);
  }

  const barber = await prisma.barber.findFirst({
    where: { id: booking.barber.id, isActive: true },
    select: {
      id: true,
      sortOrder: true,
      workingHours: { select: { weekday: true, startTime: true, endTime: true } },
      breaks: { select: { weekday: true, startTime: true, endTime: true } },
    },
  });
  if (!barber) throw new ApiError(404, "BARBER_NOT_FOUND", "Barber not found.");

  const schedule: BarberSchedule = {
    barberId: barber.id,
    sortOrder: barber.sortOrder,
    workingByWeekday: new Map(
      barber.workingHours.map((w) => [
        w.weekday,
        { startMin: dbTimeToMinutes(w.startTime), endMin: dbTimeToMinutes(w.endTime) },
      ]),
    ),
    breaksByWeekday: new Map(),
    overrides: new Map(),
  };
  for (const b of barber.breaks) {
    const list = schedule.breaksByWeekday.get(b.weekday) ?? [];
    list.push({ startMin: dbTimeToMinutes(b.startTime), endMin: dbTimeToMinutes(b.endTime) });
    schedule.breaksByWeekday.set(b.weekday, list);
  }

  const busy = await loadDayBusy([barber.id], wall.date, booking.id);
  const snapshotServices = booking.services.map((s) => ({
    id: s.serviceId,
    name: s.name,
    durationMin: s.durationMin,
    price: s.price,
  }));
  const perBarber = slotsForDate(
    {
      serviceIds: snapshotServices.map((s) => s.id),
      barberId: barber.id,
      date: wall.date,
      now,
      settings,
      services: snapshotServices,
      schedules: [schedule],
    },
    busy,
  );

  const startLabel = minutesToTime(wall.minutes);
  if (!perBarber.get(barber.id)?.slots.includes(startLabel)) {
    const endsAt = new Date(startsAt.getTime() + booking.totalDurationMin * 60_000);
    throw await slotBusyError(barber.id, startsAt, endsAt);
  }

  try {
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startsAt,
        endsAt: new Date(startsAt.getTime() + booking.totalDurationMin * 60_000),
      },
      include: bookingInclude,
    });
    return shapeBooking(updated, settings.cancelCutoffMin);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isOverlapDbError(error)) {
      throw new ApiError(409, "SLOT_TAKEN", "This slot was just taken. Please choose another time.");
    }
    throw error;
  }
}

/** Days of the booking horizon with at least one free start. */
export async function availabilityDays(
  serviceIds: string[],
  barberId: string | "any",
  now: Date,
  settings: BookingSettings,
): Promise<Array<{ date: string; hasSlots: boolean }>> {
  const services = await loadServicesOrThrow(serviceIds);
  const schedules = await loadEligibleSchedules(serviceIds, barberId);
  if (schedules.length === 0) {
    const days: Array<{ date: string; hasSlots: boolean }> = [];
    const today = toWall(now).date;
    for (let i = 0; i <= settings.bookingHorizonDays; i++) {
      days.push({ date: addDays(today, i), hasSlots: false });
    }
    return days;
  }

  const today = toWall(now).date;
  const lastDate = addDays(today, settings.bookingHorizonDays);
  const barberIds = schedules.map((s) => s.barberId);
  const rangeBusy = await loadRangeBusy(barberIds, today, lastDate);
  const days: Array<{ date: string; hasSlots: boolean }> = [];
  for (let date = today; date <= lastDate; date = addDays(date, 1)) {
    const busy = rangeBusy.get(date);
    if (!busy) {
      days.push({ date, hasSlots: false });
      continue;
    }
    const perBarber = slotsForDate(
      { serviceIds, barberId, date, now, settings, services, schedules },
      busy,
    );
    days.push({ date, hasSlots: unionSlots(perBarber).length > 0 });
  }
  return days;
}
