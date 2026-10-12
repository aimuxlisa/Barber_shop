import { FastifyInstance } from "fastify";
import { prisma } from "@barbershop/db";

export async function adminRoutes(app: FastifyInstance) {
  // === 1. БРОНИРОВАНИЯ ===
  app.get("/admin/bookings", async (request, reply) => {
    const bookings = await prisma.booking.findMany({
      orderBy: { startsAt: "desc" },
      include: { client: true, barber: true, services: true },
    });
    return reply.send({ bookings });
  });

  app.patch<{ Params: { id: string }; Body: { status: "confirmed" | "completed" | "cancelled" | "no_show" } }>(
    "/admin/bookings/:id/status",
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body || {};
      const updated = await prisma.booking.update({
        where: { id },
        data: { status },
      });
      return reply.send(updated);
    }
  );

  // === 2. УСЛУГИ (CRUD) ===
  app.post<{ Body: { name: string; description: string; durationMin: number; price: number } }>(
    "/admin/services",
    async (request, reply) => {
      const { name, description, durationMin, price } = request.body;
      const service = await prisma.service.create({
        data: { name, description, durationMin, price },
      });
      return reply.code(201).send(service);
    }
  );

  app.put<{ Params: { id: string }; Body: { name?: string; description?: string; durationMin?: number; price?: number } }>(
    "/admin/services/:id",
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;
      const updated = await prisma.service.update({
        where: { id },
        data,
      });
      return reply.send(updated);
    }
  );

  app.delete<{ Params: { id: string } }>("/admin/services/:id", async (request, reply) => {
    const { id } = request.params;
    await prisma.service.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // === 3. БАРБЕРЫ (CRUD) ===
  app.post<{ Body: { name: string; bio: string; photoUrl: string; experienceYears: number } }>(
    "/admin/barbers",
    async (request, reply) => {
      const { name, bio, photoUrl, experienceYears } = request.body;
      const barber = await prisma.barber.create({
        data: { name, bio, photoUrl: photoUrl || "/placeholder.jpg", experienceYears },
      });
      return reply.code(201).send(barber);
    }
  );

  app.put<{ Params: { id: string }; Body: { name?: string; bio?: string; photoUrl?: string; experienceYears?: number } }>(
    "/admin/barbers/:id",
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;
      const updated = await prisma.barber.update({
        where: { id },
        data,
      });
      return reply.send(updated);
    }
  );

  app.delete<{ Params: { id: string } }>("/admin/barbers/:id", async (request, reply) => {
    const { id } = request.params;
    await prisma.barber.delete({ where: { id } });
    return reply.send({ success: true });
  });

  // === 4. НАСТРОЙКИ (SETTINGS) ===
  app.get("/admin/settings", async (request, reply) => {
    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return reply.send({ settings: result });
  });

  app.post<{ Body: { settings: Record<string, string> } }>("/admin/settings", async (request, reply) => {
    const { settings } = request.body || {};
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return reply.send({ success: true });
  });
}
