import type { FastifyInstance } from "fastify";
import { prisma } from "@barbershop/db";

export async function serviceRoutes(app: FastifyInstance) {
  app.get("/services", async () => {
    return prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
      },
    });
  });
}
