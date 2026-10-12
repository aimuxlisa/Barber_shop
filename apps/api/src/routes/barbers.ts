import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@barbershop/db";

const barberIdParams = z.object({
  id: z.uuid(),
});

export async function barberRoutes(app: FastifyInstance) {
  app.get("/barbers", async () => {
    return prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        bio: true,
        experienceYears: true,
      },
    });
  });

  app.get("/barbers/:id", async (request, reply) => {
    const parsed = barberIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ code: "INVALID_ID", message: "Barber id must be a UUID." });
    }

    const barber = await prisma.barber.findFirst({
      where: { id: parsed.data.id, isActive: true },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        bio: true,
        experienceYears: true,
        barberServices: {
          where: { isEnabled: true, service: { isActive: true } },
          select: {
            durationMin: true,
            price: true,
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                durationMin: true,
                price: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    if (!barber) {
      return reply
        .code(404)
        .send({ code: "BARBER_NOT_FOUND", message: "Barber not found." });
    }

    const services = barber.barberServices
      .map((bs) => ({
        id: bs.service.id,
        name: bs.service.name,
        description: bs.service.description,
        durationMin: bs.durationMin ?? bs.service.durationMin,
        price: bs.price ?? bs.service.price,
        sortOrder: bs.service.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...service }) => service);

    return {
      id: barber.id,
      name: barber.name,
      photoUrl: barber.photoUrl,
      bio: barber.bio,
      experienceYears: barber.experienceYears,
      services,
    };
  });
}
