import { FastifyInstance } from "fastify";
import { prisma } from "@barbershop/db";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/dashboard", async (request, reply) => {
    // 1. Выручка по completed записям
    const revenueResult = await prisma.booking.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: { status: "completed" },
    });

    // 2. Статистика по статусам (отмены, неявки и т.д.)
    const statusCounts = await prisma.booking.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 3. Популярные услуги
    const popularServices = await prisma.bookingService.groupBy({
      by: ["serviceId", "name"],
      _count: { bookingId: true },
      _sum: { price: true },
      orderBy: { _count: { bookingId: "desc" } },
      take: 5,
    });

    // 4. Загрузка по барберам
    const barberStats = await prisma.booking.groupBy({
      by: ["barberId"],
      _count: { id: true },
      _sum: { totalPrice: true },
    });

    return reply.send({
      summary: {
        totalRevenue: revenueResult._sum.totalPrice || 0,
        completedBookings: revenueResult._count.id || 0,
      },
      statusBreakdown: statusCounts,
      popularServices,
      barberStats,
    });
  });
}
