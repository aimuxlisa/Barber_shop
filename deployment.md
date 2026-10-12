# Production Deployment Guide: Barbershop Platform

Эта инструкция описывает шаги по развертыванию монорепозитория на **GitHub** и **Vercel**, настройке переменных окружения и привязке Telegram Webhook.

---

## 1. Загрузка в GitHub

В локальном репозитории уже инициализирован git и зафиксирован весь исходный код проекта.

1. Создайте новый репозиторий на GitHub (например, `barbershop-monorepo`).
2. Привяжите удаленный репозиторий и отправьте код:
   ```bash
   git remote add origin https://github.com/<ВАШ_ПОЛЬЗОВАТЕЛЬ>/<ВАШ_РЕПОЗИТОРИЙ>.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Развертывание проектов в Vercel

В панели [Vercel Dashboard](https://vercel.com/new) импортируйте созданный репозиторий GitHub 3 раза для каждого приложения:

### Проект 1: `apps/api` (Backend Fastify API)
- **Root Directory**: `apps/api`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `DATABASE_URL`: Строка подключения Supabase (Transaction Pooler, порт 6543)
  - `DIRECT_URL`: Строка подключения Supabase (Session Pooler, порт 5432)
  - `ADMIN_TOKEN`: Токен для доступа к админке и защищенным эндпоинтам
  - `BOT_TOKEN`: Токен Telegram бота от @BotFather
  - `CORS_ORIGINS`: Домены фронтенда через запятую, например: `https://barbershop-web.vercel.app,https://barbershop-miniapp.vercel.app`

### Проект 2: `apps/web` (Next.js Landing & Booking)
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: URL вашего задеплоенного API, например `https://barbershop-api.vercel.app`
  - `NEXT_PUBLIC_BOT_USERNAME`: Username вашего Telegram бота без знака @

### Проект 3: `apps/miniapp` (Vite + React Telegram Mini App)
- **Root Directory**: `apps/miniapp`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: URL вашего задеплоенного API, например `https://barbershop-api.vercel.app`

---

## 3. Настройка Telegram Bot & Webhook

После получения production URL для `apps/api` и `apps/miniapp`:

1. **Привязка Mini App к боту**:
   - Откройте [@BotFather](https://t.me/BotFather) в Telegram.
   - Выберите команду `/mybots` -> выберите вашего бота -> `Bot Settings` -> `Menu Button` -> `Configure menu button`.
   - Укажите URL: `https://<ВАШ_MINIAPP_URL>.vercel.app`.

2. **Активация Webhook**:
   - Выполните запрос для установки вебхука:
   ```bash
   curl -F "url=https://<ВАШ_API_URL>.vercel.app/api/v1/telegram/webhook" "https://api.telegram.org/bot<ВАШ_BOT_TOKEN>/setWebhook"
   ```

---

## 4. Проверка и финальный чек-лист

После деплоя проверьте:
- [x] Главная страница и форма бронирования (`apps/web`) открываются и получают услуги из БД.
- [x] Telegram Mini App открывается внутри Telegram и отображает каталог и слоты.
- [x] Записи успешно создаются и приходят уведомления в Telegram.
- [x] Административная панель (`/admin`) доступна и авторизуется по `ADMIN_TOKEN`.
