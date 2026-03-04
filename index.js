const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cron = require('node-cron');
const pool = require('./db'); // Conexão PostgreSQL
const app = express();

app.use(express.json());
app.use(express.static('public')); // Serve dashboard

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// Likes temporários por ID
let likes = {};
let lastLikes = {};

// Limite diário
const LIMITE_DIARIO = 220;

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔥 Bot ativo com sucesso!");
});

// !likes <ID> <quantidade>
bot.onText(/!likes (\d+) (\d+)/, async (msg, match) => {
  const idTarget = parseInt(match[1]);
  let quantidade = parseInt(match[2]);

  // Limite diário
  if (quantidade > LIMITE_DIARIO) quantidade = LIMITE_DIARIO;

  const idSender = msg.from.id;

  if (!likes[idTarget]) likes[idTarget] = 0;
  if (!lastLikes[idTarget]) lastLikes[idTarget] = 0;

  likes[idTarget] += quantidade;

  try {
    // Salva no banco
    await pool.query(
      `INSERT INTO users(id, likes) VALUES($1, $2)
       ON CONFLICT (id) DO UPDATE SET likes = users.likes + $2`,
      [idTarget, quantidade]
    );
  } catch (err) { console.error(err); }

  lastLikes[idTarget] = quantidade;

  bot.sendMessage(idSender, `👍 Você enviou ${quantidade} likes para o ID ${idTarget}!\nTotal deste ID: ${likes[idTarget]}`);
});

// Reset diário de likes
cron.schedule('0 0 * * *', async () => {
  likes = {};
  lastLikes = {};
  try {
    await pool.query('UPDATE users SET likes = 0');
  } catch (err) { console.error(err); }
  console.log("✅ Reset diário executado");
});

// Dashboard API
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY likes DESC');
    // Adiciona lastLikes para painel
    const usersWithLast = result.rows.map(u => ({
      id: u.id,
      likes: u.likes,
      lastLikes: lastLikes[u.id] || 0
    }));
    res.json(usersWithLast);
  } catch (err) { res.status(500).send(err); }
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor rodando"));
