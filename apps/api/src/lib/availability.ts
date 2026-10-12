import { prisma } from "@barbershop/db";
import { ApiError } from "./errors";
import type { BookingSettings } from "./settings";
import {
  addDays,
  dbTimeToMinutes,
  minutesToTime,
  toWall,
  wallToUtc,
} from "./time";

/* ─── Pure slot planner ────────────────────────────────────────── */

export interface BusyInterval {
  startMin: number;
  endMin: number;
}

export interface PlanDayInput {
  openMin: number;
  closeMin: number;
  breaks: BusyInterval[];
  busy: BusyInterval[];
  totalDurationMin: number;
  stepMin: number;
  /** Wall-clock lower bound for a start (today + min_notice). Null = no bound. */
  earliestStartMin: number | null;
}

/**
 * All candidate starts on one working day as "HH:MM".
 * A start is kept only when the whole `[start, start + duration)` fits into
 * working hours and overlaps neither breaks nor busy intervals.
 */
export function planDay(input: PlanDayInput): string[] {
  const { openMin, closeMin, totalDurationMin, stepMin } = input;
  if (totalDurationMin <= 0 || stepMin <= 0 || openMin >= closeMin) return [];
  const blocked = [...input.breaks, ...input.busy].sort((a, b) => a.startMin - b.startMin);
  const slots: string[] = [];
  for (let start = openMin; start + totalDurationMin <= closeMin; start += stepMin) {
    if (input.earliestStartMin !== null && start < input.earliestStartMin) continue;
    const end = start + totalDurationMin;
    const clash = blocked.some((b) => start < b.endMin && b.startMin < end);
    if (!clash) slots.push(minutesToTime(start));
  }
  return slots;
}

/* ─── Catalogue & schedules ────────────────────────────────────── */

export interface ServiceRow {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

export async function loadServicesOrThrow(serviceIds: string[]): Promise<ServiceRow[]> {
  const unique = [...new Set(serviceIds)];
  const rows = await prisma.service.findMany({
    where: { id: { in: unique }, isActive: true },
    select: { id: true, name: true, durationMin: true, price: true },
  });
  if (rows.length !== unique.length) {
    throw new ApiError(422, "UNKNOWN_SERVICE", "One or more services are unknown or inactive.");
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  return unique.map((id) => byId.get(id) as ServiceRow);
}

export interface BarberSchedule {
  barberId: string;
  sortOrder: number;
  workingByWeekday: Map<number, { startMin: number; endMin: number }>;
  breaksByWeekday: Map<number, BusyInterval[]>;
  overrides: Map<string, { durationMin: number | null; price: number | null }>;
}

export async function loadEligibleSchedules(
  serviceIds: string[],
  barberId: string | "any",
): Promise<BarberSchedule[]> {
  const rows = await prisma.barber.findMany({
    where: barberId === "any" ? { isActive: true } : { id: barberId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      sortOrder: true,
      workingHours: { select: { weekday: true, startTime: true, endTime: true } },
      breaks: { select: { weekday: true, startTime: true, endTime: true } },
      barberServices: {
        where: { serviceId: { in: serviceIds } },
        select: { serviceId: true, durationMin: true, price: true, isEnabled: true },
      },
    },
  });

  if (barberId !== "any" && rows.length === 0) {
    throw new ApiError(404, "BARBER_NOT_FOUND", "Barber not found.");
  }

  const eligible = rows.filter((row) =>
    serviceIds.every((id) => row.barberServices.some((bs) => bs.serviceId === id && bs.isEnabled)),
  );

  if (barberId !== "any" && eligible.length === 0) {
    throw new ApiError(422, "BARBER_CANNOT_DO_SERVICE", "This barber does not perform all selected services.");
  }

  return eligible.map((row) => ({
    barberId: row.id,
    sortOrder: row.sortOrder,
    workingByWeekday: new Map(
      row.workingHours.map((w) => [
        w.weekday,
        { startMin: dbTimeToMinutes(w.startTime), endMin: dbTimeToMinutes(w.endTime) },
      ]),
    ),
    breaksByWeekday: groupBreaks(row.breaks),
    overrides: new Map(
      row.barberServices.map((bs) => [bs.serviceId, { durationMin: bs.durationMin, price: bs.price }]),
    ),
  }));
}

function groupBreaks(
  rows: Array<{ weekday: number; startTime: Date | string; endTime: Date | string }>,
): Map<number, BusyInterval[]> {
  const map = new Map<number, BusyInterval[]>();
  for (const row of rows) {
    const list = map.get(row.weekday) ?? [];
    list.push({ startMin: dbTimeToMinutes(row.startTime), endMin: dbTimeToMinutes(row.endTime) });
    map.set(row.weekday, list);
  }
  return map;
}

/* ─── Day context (bookings + time off, clipped to one date) ───── */

function clipToDay(
  startsAt: Date,
  endsAt: Date,
  dayStartUtc: Date,
  dayEndUtc: Date,
): BusyInterval | null {
  const startMs = Math.max(startsAt.getTime(), dayStartUtc.getTime());
  const endMs = Math.min(endsAt.getTime(), dayEndUtc.getTime());
  if (startMs >= endMs) return null;
  return {
    startMin: Math.floor((startMs - dayStartUtc.getTime()) / 60_000),
    endMin: Math.ceil((endMs - dayStartUtc.getTime()) / 60_000),
  };
}

export interface DayBusy {
  byBarber: Map<string, BusyInterval[]>;
  shopWide: BusyInterval[];
}

/**
 * Confirmed bookings + time off for a whole date range with two queries.
 * Shop-wide time off (`barber_id = null`) lands in `shopWide`.
 */
export async function loadRangeBusy(
  barberIds: string[],
  startDate: string,
  endDateInclusive: string,
  excludeBookingId?: string,
): Promise<Map<string, DayBusy>> {
  const rangeStartUtc = wallToUtc(startDate, 0);
  const rangeEndUtc = wallToUtc(addDays(endDateInclusive, 1), 0);

  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: {
        barberId: { in: barberIds },
        status: "confirmed",
        startsAt: { lt: rangeEndUtc },
        endsAt: { gt: rangeStartUtc },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ barberId: { in: barberIds } }, { barberId: null }],
        startsAt: { lt: rangeEndUtc },
        endsAt: { gt: rangeStartUtc },
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const days = new Map<string, DayBusy>();
  for (let d = startDate; d <= endDateInclusive; d = addDays(d, 1)) {
    const byBarber = new Map<string, BusyInterval[]>();
    for (const id of barberIds) byBarber.set(id, []);
    days.set(d, { byBarber, shopWide: [] });
  }

  const pushInterval = (startsAt: Date, endsAt: Date, barberId: string | null) => {
    if (endsAt.getTime() <= startsAt.getTime()) return;
    let day = toWall(startsAt).date;
    const last = toWall(new Date(endsAt.getTime() - 1)).date;
    while (day <= last) {
      const entry = days.get(day);
      if (entry) {
        const clipped = clipToDay(
          startsAt,
          endsAt,
          wallToUtc(day, 0),
          wallToUtc(addDays(day, 1), 0),
        );
        if (clipped) {
          if (barberId === null) entry.shopWide.push(clipped);
          else entry.byBarber.get(barberId)?.push(clipped);
        }
      }
      day = addDays(day, 1);
    }
  };

  for (const booking of bookings) pushInterval(booking.startsAt, booking.endsAt, booking.barberId);
  for (const off of timeOff) pushInterval(off.startsAt, off.endsAt, off.barberId);

  return days;
}

export async function loadDayBusy(
  barberIds: string[],
  date: string,
  excludeBookingId?: string,
): Promise<DayBusy> {
  const days = await loadRangeBusy(barberIds, date, date, excludeBookingId);
  return days.get(date) as DayBusy;
}

/* ─── Effective totals (barber overrides win) ──────────────────── */

export function effectiveTotals(
  services: ServiceRow[],
  overrides: Map<string, { durationMin: number | null; price: number | null }>,
): { durationMin: number; price: number } {
  let durationMin = 0;
  let price = 0;
  for (const service of services) {
    const override = overrides.get(service.id);
    durationMin += override?.durationMin ?? service.durationMin;
    price += override?.price ?? service.price;
  }
  return { durationMin, price };
}

/* ─── Public computations ──────────────────────────────────────── */

export interface DaySlots {
  slots: string[];
  durationMin: number;
  price: number;
}

export function daySlotsForBarber(
  schedule: BarberSchedule,
  services: ServiceRow[],
  date: string,
  weekdayIso: number,
  busy: DayBusy,
  settings: BookingSettings,
  now: Date,
): DaySlots {
  const working = schedule.workingByWeekday.get(weekdayIso);
  const { durationMin, price } = effectiveTotals(services, schedule.overrides);
  if (!working) return { slots: [], durationMin, price };

  const todayWall = toWall(now);
  const earliestStartMin =
    date === todayWall.date ? todayWall.minutes + settings.minNoticeMin : null;

  const busyIntervals = [
    ...(busy.byBarber.get(schedule.barberId) ?? []),
    ...busy.shopWide,
  ];

  return {
    slots: planDay({
      openMin: working.startMin,
      closeMin: working.endMin,
      breaks: schedule.breaksByWeekday.get(weekdayIso) ?? [],
      busy: busyIntervals,
      totalDurationMin: durationMin,
      stepMin: settings.slotStepMin,
      earliestStartMin,
    }),
    durationMin,
    price,
  };
}

export interface AvailabilityInput {
  serviceIds: string[];
  barberId: string | "any";
  date: string;
  now: Date;
  settings: BookingSettings;
  services: ServiceRow[];
  schedules: BarberSchedule[];
}

export function slotsForDate(input: AvailabilityInput, busy: DayBusy): Map<string, DaySlots> {
  const weekdayIso = toWall(wallToUtc(input.date, 0)).weekdayIso;
  const result = new Map<string, DaySlots>();
  for (const schedule of input.schedules) {
    result.set(
      schedule.barberId,
      daySlotsForBarber(
        schedule,
        input.services,
        input.date,
        weekdayIso,
        busy,
        input.settings,
        input.now,
      ),
    );
  }
  return result;
}

/** Union of every eligible barber's starts, sorted. */
export function unionSlots(perBarber: Map<string, DaySlots>): string[] {
  const all = new Set<string>();
  for (const day of perBarber.values()) {
    for (const slot of day.slots) all.add(slot);
  }
  return [...all].sort();
}
