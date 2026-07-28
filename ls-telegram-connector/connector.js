// LS Autotruck - Conector do Telegram
// Escuta o bot e, quando o cliente aperta "Iniciar" com um token valido,
// liga o Telegram dele na plataforma automaticamente. Token unico e temporario.
const fs = require('fs');
const { Client } = require('pg');

const xml = fs.readFileSync('/opt/traccar/conf/traccar.xml', 'utf8');
const token = (xml.match(/notificator\.telegram\.key'>\s*([^<\s]+)/) || [])[1];
const dbPassword = (xml.match(/database\.password'>\s*([^<\s]+)/) || [])[1];
if (!token || !dbPassword) {
  console.error('Faltou o token do Telegram ou a senha do banco no traccar.xml');
  process.exit(1);
}
const API = `https://api.telegram.org/bot${token}`;

const db = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'traccar',
  database: 'traccar',
  password: dbPassword,
});

async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

async function handleStart(chatId, name, payload) {
  if (payload && /^[A-Za-z0-9_-]{6,}$/.test(payload)) {
    const res = await db.query(
      "UPDATE tc_users SET attributes = ((COALESCE(NULLIF(attributes,''),'{}')::jsonb - 'telegramLinkToken') || jsonb_build_object('telegramChatId', $1::text))::text WHERE (COALESCE(NULLIF(attributes,''),'{}')::jsonb->>'telegramLinkToken') = $2 RETURNING id",
      [String(chatId), payload],
    );
    if (res.rowCount > 0) {
      const userId = res.rows[0].id;
      await db.query(
        "UPDATE tc_notifications SET notificators = CASE WHEN notificators LIKE '%telegram%' THEN notificators ELSE notificators || ',telegram' END WHERE id IN (SELECT notificationid FROM tc_user_notification WHERE userid = $1)",
        [userId],
      );
      await tg('sendMessage', {
        chat_id: chatId,
        text: '✅ Telegram conectado! Voce vai receber os alertas da LS Autotruck aqui.',
      });
      console.log('conectado userId=%s', userId);
      return;
    }
    await tg('sendMessage', {
      chat_id: chatId,
      text: 'Este link expirou ou e invalido. Abra o app da LS Autotruck e toque em "Conectar Telegram" de novo.',
    });
    return;
  }
  await tg('sendMessage', {
    chat_id: chatId,
    text: `Ola${name ? ', ' + name : ''}! Para receber os alertas, use o botao "Conectar Telegram" no app da LS Autotruck.\n\nSe o app pedir um codigo, use este: ${chatId}`,
  });
}

let offset = 0;
async function loop() {
  try {
    const r = await fetch(`${API}/getUpdates?timeout=30&offset=${offset}`);
    const j = await r.json();
    if (j.ok && Array.isArray(j.result)) {
      for (const u of j.result) {
        offset = u.update_id + 1;
        const m = u.message;
        if (!m || !m.text) continue;
        const parts = m.text.trim().split(/\s+/);
        if (parts[0] === '/start') {
          const name = (m.from && m.from.first_name) || '';
          // eslint-disable-next-line no-await-in-loop
          await handleStart(m.chat.id, name, parts[1]);
        }
      }
    }
  } catch (e) {
    console.error('loop erro:', e.message);
    await new Promise((res) => setTimeout(res, 3000));
  }
  setImmediate(loop);
}

(async () => {
  await db.connect();
  try {
    await tg('deleteWebhook', {});
  } catch {
    // ignore
  }
  console.log('LS Telegram connector no ar');
  loop();
})().catch((e) => {
  console.error('fatal:', e.message);
  process.exit(1);
});
