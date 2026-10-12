import { config } from "dotenv";
import { resolve } from "node:path";

config();
config({ path: resolve(process.cwd(), "../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { prisma } from "@barbershop/db";
import { healthRoutes } from "./routes/health";
import { serviceRoutes } from "./routes/services";
import { barberRoutes } from "./routes/barbers";
import { availabilityRoutes } from "./routes/availability";
import { bookingRoutes } from "./routes/bookings";
import { meRoutes } from "./routes/me";
import { reminderRoutes } from "./routes/reminders";
import { analyticsRoutes } from "./routes/analytics";
import { adminRoutes } from "./routes/admin";
import { adminAuthRoutes } from "./routes/adminAuth";

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3002,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie);

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found.`,
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const cause = error as { statusCode?: unknown; code?: unknown; message?: unknown };
    const status =
      typeof cause.statusCode === "number" && cause.statusCode < 500
        ? cause.statusCode
        : 500;
    return reply.code(status).send({
      code: status === 500 ? "INTERNAL" : (cause.code ?? "ERROR"),
      message: status === 500 ? "Internal server error." : cause.message,
    });
  });

  await app.register(healthRoutes);
  await app.register(serviceRoutes, { prefix: "/api/v1" });
  await app.register(barberRoutes, { prefix: "/api/v1" });
  await app.register(availabilityRoutes, { prefix: "/api/v1" });
  await app.register(bookingRoutes, { prefix: "/api/v1" });
  await app.register(meRoutes, { prefix: "/api/v1" });
  await app.register(reminderRoutes, { prefix: "/api/v1" });
  await app.register(analyticsRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });
  await app.register(adminAuthRoutes, { prefix: "/api/v1" });

  return app;
}

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
