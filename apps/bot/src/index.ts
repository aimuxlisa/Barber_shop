import { Bot, InlineKeyboard } from "grammy";
import { config } from "dotenv";

config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set in .env");
  process.exit(1);
}

const bot = new Bot(process.env.BOT_TOKEN);

// /start command – handles deep link payload
bot.command("start", async (ctx) => {
  const payload = ctx.message?.text?.split(" ")[1] ?? "";
  if (payload) {
    await ctx.reply(`👋 Привет! Вы открыли бота с payload: ${payload}`);
  } else {
    await ctx.reply(
      "👋 Привет! Я бот барбершопа. Используйте меню ниже для навигации.",
      { reply_markup: mainMenuKeyboard },
    );
  }
});

// Inline menu keyboard
const mainMenuKeyboard = new InlineKeyboard()
  .text("Записаться", "action:book")
  .text("Мои записи", "action:my_bookings")
  .row()
  .text("Помощь", "action:help");

// Action handlers (placeholder implementations)
bot.callbackQuery("action:book", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔧 Функция записи пока в разработке.");
});

bot.callbackQuery("action:my_bookings", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📄 Здесь будут ваши записи.");
});

bot.callbackQuery("action:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("❓ Для начала нажмите /start.");
});

// Start polling (development mode)
bot.start();
