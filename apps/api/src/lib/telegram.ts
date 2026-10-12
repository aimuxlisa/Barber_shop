import { createHmac } from "node:crypto";
import { prisma } from "@barbershop/db";
import { ApiError } from "./errors";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: number;
  hash: string;
  queryId?: string;
}

/**
 * Validate Telegram initData using HMAC-SHA256 according to Telegram specifications.
 * In development / demo mode, if TELEGRAM_BOT_TOKEN is not set or placeholder,
 * allow test initData strings for testing and preview.
 */
export function validateTelegramInitData(
  initDataRaw: string,
  botToken: string = process.env.TELEGRAM_BOT_TOKEN || "",
): ValidatedInitData {
  if (!initDataRaw) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing Telegram initData.");
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) {
    throw new ApiError(401, "INVALID_INIT_DATA", "initData missing hash.");
  }

  const userStr = params.get("user");
  if (!userStr) {
    throw new ApiError(401, "INVALID_INIT_DATA", "initData missing user payload.");
  }

  let user: TelegramUser;
  try {
    user = JSON.parse(userStr);
  } catch {
    throw new ApiError(400, "INVALID_USER", "Malformed user JSON in initData.");
  }

  const authDate = Number(params.get("auth_date") || 0);

  // If token is configured, perform strict HMAC validation
  if (botToken && botToken !== "mock_bot_token" && !botToken.startsWith("dummy")) {
    const dataCheckArr: string[] = [];
    params.forEach((val, key) => {
      if (key !== "hash") {
        dataCheckArr.push(`${key}=${val}`);
      }
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) {
      throw new ApiError(401, "INVALID_SIGNATURE", "Telegram initData hash mismatch.");
    }

    // Check expiration: 24h
    const nowSec = Math.floor(Date.now() / 1000);
    if (authDate && nowSec - authDate > 86400) {
      throw new ApiError(401, "INIT_DATA_EXPIRED", "Telegram session has expired.");
    }
  }

  return {
    user,
    authDate,
    hash,
    queryId: params.get("query_id") || undefined,
  };
}

/**
 * Find or create client linked to this Telegram user
 */
export async function getOrCreateTelegramClient(user: TelegramUser, phone?: string) {
  const telegramIdStr = String(user.id);
  
  let client = await prisma.client.findUnique({
    where: { telegramId: telegramIdStr },
  });

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || `Telegram user ${user.id}`;

  if (!client) {
    client = await prisma.client.create({
      data: {
        telegramId: telegramIdStr,
        name: fullName,
        phone: phone || "+998900000000",
        telegramChatId: telegramIdStr,
      },
    });
  } else if (phone && (!client.phone || client.phone === "+998900000000")) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { phone, name: fullName },
    });
  }

  return client;
}
