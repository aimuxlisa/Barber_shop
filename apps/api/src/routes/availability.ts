import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  effectiveTotals,
  loadDayBusy,
  loadEligibleSchedules,
  loadServicesOrThrow,
  slotsForDate,
  unionSlots,
} from "../lib/availability";
import { availabilityDays } from "../lib/bookings";
import { ApiError } from "../lib/errors";
import { loadSettings } from "../lib/settings";
import { isValidDateString, toWall, addDays } from "../lib/time";

const uuidSchema = z.uuid();

function parseServiceIds(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const unique = [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
  if (unique.length === 0 || !unique.every((id) => uuidSchema.safeParse(id).success)) {
    throw new ApiError(400, "INVALID_SERVICE_IDS", "serviceIds must be a non-empty list of UUIDs.");
  }
  return unique;
}

function parseBarberId(raw: unknown): string | "any" {
  if (raw === "any") return "any";
  if (typeof raw === "string" && uuidSchema.safeParse(raw).success) return raw;
  throw new ApiError(400, "INVALID_BARBER_ID", 'barberId must be a UUID or "any".');
}

function sendApiError(reply: FastifyReply, error: unknown) {
  if (error instanceof ApiError) {
    return reply.code(error.status).send({ code: error.code, message: error.message });
  }
  throw error;
}

export async function availabilityRoutes(app: FastifyInstance) {
  app.get("/availability", async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const serviceIds = parseServiceIds(query.serviceIds);
      const barberId = parseBarberId(query.barberId);
      const date = typeof query.date === "string" && isValidDateString(query.date) ? query.date : null;
      if (!date) {
        return reply.code(400).send({ code: "INVALID_DATE", message: "date must be YYYY-MM-DD." });
      }

      const settings = await loadSettings();
      const now = new Date();
      const today = toWall(now).date;
      if (date < today) {
        return reply.code(422).send({ code: "DATE_OUT_OF_RANGE", message: "This date is in the past." });
      }
      if (date > addDays(today, settings.bookingHorizonDays)) {
        return reply.code(422).send({ code: "TOO_FAR", message: "Bookings are only open for the coming days." });
      }

      const services = await loadServicesOrThrow(serviceIds);
      const schedules = await loadEligibleSchedules(serviceIds, barberId);
      const busy = await loadDayBusy(
        schedules.map((s) => s.barberId),
        date,
      );
      const perBarber = slotsForDate(
        { serviceIds, barberId, date, now, settings, services, schedules },
        busy,
      );

      const base = effectiveTotals(services, new Map());
      return {
        date,
        barberId,
        slots: unionSlots(perBarber),
        totalDurationMin: base.durationMin,
        totalPrice: base.price,
      };
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get("/availability/days", async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const serviceIds = parseServiceIds(query.serviceIds);
      const barberId = parseBarberId(query.barberId);
      const settings = await loadSettings();
      const days = await availabilityDays(serviceIds, barberId, new Date(), settings);
      return { barberId, serviceIds, days };
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}
