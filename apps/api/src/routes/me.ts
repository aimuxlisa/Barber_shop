import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "@barbershop/db";
import { ApiError } from "../lib/errors";
import { getOrCreateTelegramClient, validateTelegramInitData } from "../lib/telegram";

function sendApiError(reply: FastifyReply, error: unknown) {
  if (error instanceof ApiError) {
    return reply.code(error.status).send({ code: error.code, message: error.message });
  }
  throw error;
}

export async function meRoutes(app: FastifyInstance) {
  // Validate initData and return client profile
  app.post("/me/auth", async (request, reply) => {
    try {
      const body = request.body as { initData?: string };
      if (!body?.initData) {
        return reply.code(400).send({ code: "MISSING_INIT_DATA", message: "initData is required." });
      }
      const validated = validateTelegramInitData(body.initData);
      const client = await getOrCreateTelegramClient(validated.user);
      return { client, user: validated.user };
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  // Return bookings for Telegram client
  app.get("/me/bookings", async (request, reply) => {
    try {
      const authHeader = (request.headers["x-telegram-init-data"] || request.headers.authorization) as string | undefined;
      const initData = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : "";
      
      if (!initData) {
        return reply.code(401).send({ code: "UNAUTHORIZED", message: "Missing Telegram authorization header." });
      }

      const validated = validateTelegramInitData(initData);
      const client = await getOrCreateTelegramClient(validated.user);

      const bookings = await prisma.booking.findMany({
        where: { clientId: client.id },
        include: {
          barber: true,
          services: true,
        },
        orderBy: { startsAt: "desc" },
      });

      return { bookings };
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}
