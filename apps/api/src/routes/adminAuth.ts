import { FastifyInstance } from "fastify";
import "@fastify/cookie";
import { prisma } from "@barbershop/db";
import crypto from "node:crypto";

// Простая функция хеширования для админов (в реальном продакшене используем argon2)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function adminAuthRoutes(app: FastifyInstance) {
  // 1. Создать/проверить первого администратора
  app.post("/admin/seed", async (request, reply) => {
    const existing = await prisma.adminUser.findFirst();
    if (existing) {
      return reply.send({ message: "Admin user already exists." });
    }
    const admin = await prisma.adminUser.create({
      data: {
        login: "admin",
        passwordHash: hashPassword("admin123"),
      },
    });
    return reply.send({ message: "Admin created", login: admin.login });
  });

  // 2. Логин админа
  app.post<{ Body: { login?: string; password?: string } }>("/admin/login", async (request, reply) => {
    const { login, password } = request.body || {};
    if (!login || !password) {
      return reply.code(400).send({ code: "BAD_REQUEST", message: "Login and password are required" });
    }

    const admin = await prisma.adminUser.findUnique({ where: { login } });
    if (!admin || admin.passwordHash !== hashPassword(password)) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    // Установка httpOnly cookie сессии
    reply.setCookie("admin_session", admin.id, {
      path: "/",
      httpOnly: true,
      secure: false, // dev mode
      sameSite: "lax",
      maxAge: 86400 * 7,
    });

    return reply.send({ success: true, user: { id: admin.id, login: admin.login } });
  });

  // 3. Выход из системы
  app.post("/admin/logout", async (request, reply) => {
    reply.clearCookie("admin_session", { path: "/" });
    return reply.send({ success: true });
  });
}
