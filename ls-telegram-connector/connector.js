// LS Autotruck - Conector do Telegram + Vigia de bloqueio/desbloqueio
// 1) Conecta o bot ao cliente automaticamente (/start com token seguro).
// 2) Observa a mudanca do estado 'blocked' e dispara o alerta (evento na
//    plataforma + mensagem no Telegram), porque o rastreador nao manda
//    o alarme lock/unlock por conta propria.
const fs = require('fs');
const { Pool } = require('pg');

const xml = fs.readFileSync('/opt/traccar/conf/traccar.xml', 'utf8');
const token = (xml.match(/notificator\.telegram\.key'>\s*([^<\s]+)/) || [])[1];
const dbPassword = (xml.match(/database\.password'>\s*([^<\s]+)/) || [])[1];
if (!token || !dbPassword) {
  console.error('Faltou o token do Telegram ou a senha do banco no traccar.xml');
  process.exit(1);
}
const API = `https://api.telegram.org/bot${token}`;

const db = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'traccar',
  database: 'traccar',
  password: dbPassword,
  max: 4,
});

async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

// ---------- 1) Conectar Telegram ----------
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
async function pollUpdates() {
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
    console.error('poll erro:', e.message);
    await new Promise((res) => setTimeout(res, 3000));
  }
  setImmediate(pollUpdates);
}

// ---------- 2) Vigia de bloqueio/desbloqueio ----------
async function onBlockChange(deviceId, positionId, deviceName, blocked) {
  const alarm = blocked ? 'lock' : 'unlock';
  const emoji = blocked ? '🔒' : '🔓';
  const label = blocked ? 'BLOQUEADO' : 'DESBLOQUEADO';
  // 2a) evento na plataforma (aparece na lista de alertas/eventos)
  try {
    await db.query(
      "INSERT INTO tc_events (type, eventtime, deviceid, positionid, attributes) VALUES ('alarm', now(), $1, $2, $3)",
      [deviceId, positionId, JSON.stringify({ alarm })],
    );
  } catch (e) {
    console.error('evento erro:', e.message);
  }
  // 2b) Telegram para quem quer esse alerta e ve o veiculo
  try {
    const users = await db.query(
      "SELECT DISTINCT u.attributes::jsonb->>'telegramChatId' AS chat FROM tc_users u JOIN tc_user_notification un ON un.userid = u.id JOIN tc_notifications n ON n.id = un.notificationid WHERE n.type = 'alarm' AND (n.attributes::jsonb->>'alarms') = $1 AND u.attributes::jsonb->>'telegramChatId' IS NOT NULL AND (u.administrator = true OR EXISTS (SELECT 1 FROM tc_user_device ud WHERE ud.userid = u.id AND ud.deviceid = $2))",
      [alarm, deviceId],
    );
    for (const row of users.rows) {
      if (row.chat) {
        // eslint-disable-next-line no-await-in-loop
        await tg('sendMessage', { chat_id: row.chat, text: `${emoji} ${deviceName}: veiculo ${label}` });
      }
    }
  } catch (e) {
    console.error('tg alerta erro:', e.message);
  }
  console.log('bloqueio mudou device=%s -> %s', deviceId, label);
}

async function watchBlocks() {
  try {
    const r = await db.query(
      "SELECT d.id AS deviceid, d.positionid, d.name, (p.attributes::jsonb->>'blocked') AS blocked FROM tc_devices d JOIN tc_positions p ON p.id = d.positionid WHERE p.attributes LIKE '%blocked%'",
    );
    for (const row of r.rows) {
      const cur = row.blocked === 'true';
      // eslint-disable-next-line no-await-in-loop
      const prev = await db.query('SELECT blocked FROM ls_block_state WHERE deviceid = $1', [row.deviceid]);
      if (prev.rowCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await db.query('INSERT INTO ls_block_state (deviceid, blocked) VALUES ($1, $2)', [row.deviceid, cur]);
      } else if (prev.rows[0].blocked !== cur) {
        // eslint-disable-next-line no-await-in-loop
        await db.query('UPDATE ls_block_state SET blocked = $2, updated = now() WHERE deviceid = $1', [row.deviceid, cur]);
        // eslint-disable-next-line no-await-in-loop
        await onBlockChange(row.deviceid, row.positionid, row.name, cur);
      }
    }
  } catch (e) {
    console.error('vigia erro:', e.message);
  }
  setTimeout(watchBlocks, 20000);
}

(async () => {
  await db.query(
    'CREATE TABLE IF NOT EXISTS ls_block_state (deviceid integer PRIMARY KEY, blocked boolean, updated timestamp DEFAULT now())',
  );
  try {
    await tg('deleteWebhook', {});
  } catch {
    // ignore
  }
  console.log('LS connector no ar (telegram + vigia de bloqueio)');
  pollUpdates();
  watchBlocks();
})().catch((e) => {
  console.error('fatal:', e.message);
  process.exit(1);
});
