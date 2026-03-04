const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let likes = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔥 Bot ativo com sucesso!");
});

bot.onText(/\/enviar (\\d+)/, (msg, match) => {
  const quantidade = parseInt(match[1]);
  const id = msg.from.id;

  if (!likes[id]) likes[id] = 0;
  likes[id] += quantidade;

  bot.sendMessage(id, `👑 Likes enviados: ${quantidade}\nTotal: ${likes[id]}`);
});

cron.schedule('0 0 * * *', () => {
  likes = {};
  console.log("Reset diário executado");
});

app.get('/', (req, res) => {
  res.send("Bot FF Online 🚀");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Servidor rodando")
);
