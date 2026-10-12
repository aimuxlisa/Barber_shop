import { FastifyInstance } from "fastify";
import { prisma } from "@barbershop/db";

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function processReminders() {
  const now = new Date();
  const summary = {
    dayRemindersSent: 0,
    m30RemindersSent: 0,
    autoCompleted: 0,
    reviewRequestsSent: 0,
  };

  // 1. Напоминание за 1 день (от 23 до 25 часов до визита)
  const dayStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const dayEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const dayBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      reminderDaySentAt: null,
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    include: { client: true, barber: true, services: true },
  });

  for (const booking of dayBookings) {
    if (booking.client.telegramChatId) {
      const timeStr = booking.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      const text = `⏰ <b>Напоминание о записи!</b>\n\nЗавтра в <b>${timeStr}</b> у вас визит к барберу <b>${booking.barber.name}</b>. Ждём вас!`;
      await sendTelegramMessage(booking.client.telegramChatId, text);
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderDaySentAt: new Date() },
    });
    summary.dayRemindersSent++;
  }

  // 2. Напоминание за 30 минут (от 20 до 40 минут до визита)
  const m30Start = new Date(now.getTime() + 20 * 60 * 1000);
  const m30End = new Date(now.getTime() + 40 * 60 * 1000);

  const m30Bookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      reminder30mSentAt: null,
      startsAt: { gte: m30Start, lte: m30End },
    },
    include: { client: true, barber: true },
  });

  for (const booking of m30Bookings) {
    if (booking.client.telegramChatId) {
      const text = `⏳ <b>До вашего визита осталось 30 минут!</b>\n\nБарбер <b>${booking.barber.name}</b> готовит рабочее место.`;
      await sendTelegramMessage(booking.client.telegramChatId, text);
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminder30mSentAt: new Date() },
    });
    summary.m30RemindersSent++;
  }

  // 3. Автоматическое завершение прошедших записей
  const pastBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      endsAt: { lte: now },
      autoCompletedAt: null,
    },
  });

  for (const booking of pastBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "completed",
        autoCompletedAt: new Date(),
      },
    });
    summary.autoCompleted++;
  }

  // 4. Запрос отзыва по завершенным визитам (прошло более 1 часа после конца визита)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const reviewBookings = await prisma.booking.findMany({
    where: {
      status: "completed",
      reviewRequestedAt: null,
      endsAt: { lte: oneHourAgo },
    },
    include: { client: true, barber: true },
  });

  for (const booking of reviewBookings) {
    if (booking.client.telegramChatId) {
      const text = `⭐ <b>Как вам визит у ${booking.barber.name}?</b>\n\nПожалуйста, оцените работу мастера!`;
      await sendTelegramMessage(booking.client.telegramChatId, text);
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reviewRequestedAt: new Date() },
    });
    summary.reviewRequestsSent++;
  }

  return summary;
}

export async function reminderRoutes(app: FastifyInstance) {
  // Эндпоинт для запуска обработки фоновых задач / Cron
  app.post("/reminders/process", async (request, reply) => {
    // В продакшене проверяем секретный токен для Cron
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const result = await processReminders();
    return reply.send({ success: true, processed: result });
  });
}
