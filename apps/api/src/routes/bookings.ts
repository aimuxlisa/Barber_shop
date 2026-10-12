import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  cancelBooking,
  createBooking,
  getBookingByToken,
  rescheduleBooking,
} from "../lib/bookings";
import { ApiError } from "../lib/errors";

const createBookingSchema = z.object({
  serviceIds: z.array(z.uuid()).min(1).max(10),
  barberId: z.union([z.uuid(), z.literal("any")]),
  startsAt: z.string().min(1),
  client: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .regex(/^\+?[\d\s\-()]{7,30}$/, "Enter a valid phone number."),
  }),
});

const tokenParamsSchema = z.object({
  token: z.uuid(),
});

const rescheduleSchema = z.object({
  startsAt: z.string().min(1),
});

function sendApiError(reply: FastifyReply, error: unknown) {
  if (error instanceof ApiError) {
    return reply.code(error.status).send({ code: error.code, message: error.message });
  }
  throw error;
}

export async function bookingRoutes(app: FastifyInstance) {
  app.post("/bookings", async (request, reply) => {
    const parsed = createBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_INPUT", message: "Invalid booking data." });
    }
    try {
      const created = await createBooking({
        serviceIds: parsed.data.serviceIds,
        barberId: parsed.data.barberId,
        startsAt: new Date(parsed.data.startsAt),
        name: parsed.data.client.name,
        phone: parsed.data.client.phone,
        source: "web",
      });
      return reply.code(201).send(created);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get("/bookings/:token", async (request, reply) => {
    const parsed = tokenParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_TOKEN", message: "Booking token must be a UUID." });
    }
    try {
      return await getBookingByToken(parsed.data.token);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post("/bookings/:token/cancel", async (request, reply) => {
    const parsed = tokenParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_TOKEN", message: "Booking token must be a UUID." });
    }
    try {
      return await cancelBooking(parsed.data.token);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post("/bookings/:token/reschedule", async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ code: "INVALID_TOKEN", message: "Booking token must be a UUID." });
    }
    const parsedBody = rescheduleSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ code: "INVALID_INPUT", message: "startsAt is required." });
    }
    try {
      return await rescheduleBooking(parsedParams.data.token, new Date(parsedBody.data.startsAt));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}
