# Instructions for Deploying the Barbershop Monorepo to Production

## 1. Vercel Configuration & Environment Variables

### Apps to Deploy on Vercel:
1. `apps/web` (Next.js Website)
2. `apps/miniapp` (Vite + React Telegram Mini App)
3. `apps/api` (Fastify Serverless API)

---

## 2. Recommended Environment Variables Matrix

### `apps/api`:
- `DATABASE_URL`: Connection string (Prisma transaction pooler)
- `DIRECT_URL`: Connection string (Prisma session pooler)
- `CORS_ORIGINS`: Allowed production frontend domains
- `BOT_TOKEN`: Telegram bot API token

### `apps/web`:
- `NEXT_PUBLIC_API_URL`: URL of the deployed `apps/api` (e.g. `https://barbershop-api.vercel.app`)

### `apps/miniapp`:
- `VITE_API_URL`: URL of the deployed `apps/api`

---

## 3. Telegram Webhook & Mini App Setup

To activate the bot in production mode:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://barbershop-api.vercel.app/telegram/webhook"
```
