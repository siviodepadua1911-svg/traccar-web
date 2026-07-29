// LS Autotruck - Conector do Telegram + Vigia de bloqueio/desbloqueio
// 1) Conecta o bot ao cliente automaticamente (/start com token seguro).
// 2) Observa a mudanca do estado 'blocked' e dispara o alerta (evento na
//    plataforma + mensagem no Telegram), porque o rastreador nao manda
//    o alarme lock/unlock por conta propria.
const fs = require('fs');
const { Pool } = require('pg');
const crypto = require('crypto');

const xml = fs.readFileSync('/opt/traccar/conf/traccar.xml', 'utf8');
const token = (xml.match(/notificator\.telegram\.key'>\s*([^<\s]+)/) || [])[1];
const dbPassword = (xml.match(/database\.password'>\s*([^<\s]+)/) || [])[1];
if (!token || !dbPassword) {
  console.error('Faltou o token do Telegram ou a senha do banco no traccar.xml');
  process.exit(1);
}
const API = `https://api.telegram.org/bot${token}`;

// ---------- Firebase (push para o celular, mesmo com o app fechado) ----------
const PROJECT_ID = 'ls-autotruck';
let serviceAccount = null;
try {
  const saRaw = (xml.match(/notificator\.firebase\.serviceAccount'>([\s\S]*?)<\/entry>/) || [])[1] || '';
  const clean = saRaw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
  const a = clean.indexOf('{');
  const b = clean.lastIndexOf('}');
  if (a >= 0 && b > a) {
    serviceAccount = JSON.parse(clean.slice(a, b + 1));
  }
} catch (e) {
  console.error('serviceAccount Firebase invalido:', e.message);
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

let fcmAccess = null;
let fcmAccessExp = 0;
async function getFcmAccessToken() {
  if (!serviceAccount) return null;
  if (fcmAccess && Date.now() < fcmAccessExp - 60000) return fcmAccess;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(serviceAccount.private_key));
  const jwt = `${header}.${claim}.${sig}`;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const j = await r.json();
    if (!j.access_token) {
      console.error('fcm oauth erro:', JSON.stringify(j).slice(0, 150));
      return null;
    }
    fcmAccess = j.access_token;
    fcmAccessExp = Date.now() + (j.expires_in || 3600) * 1000;
    return fcmAccess;
  } catch (e) {
    console.error('fcm oauth falhou:', e.message);
    return null;
  }
}

async function pruneDeadToken(userId, deadToken) {
  if (!userId) return;
  try {
    const u = await db.query(
      "SELECT attributes::jsonb->>'notificationTokens' AS t FROM tc_users WHERE id = $1",
      [userId],
    );
    const cur = (u.rows[0] && u.rows[0].t) || '';
    const kept = cur
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && x !== deadToken)
      .join(',');
    if (kept !== cur) {
      await db.query(
        "UPDATE tc_users SET attributes = ((COALESCE(NULLIF(attributes,''),'{}')::jsonb) || jsonb_build_object('notificationTokens', $2::text))::text WHERE id = $1",
        [userId, kept],
      );
      console.log('token morto removido do user %s', userId);
    }
  } catch (e) {
    console.error('poda token erro:', e.message);
  }
}

async function sendFcm(deviceToken, title, body, userId) {
  const at = await getFcmAccessToken();
  if (!at || !deviceToken) return;
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data: { title, body },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'ls_bloqueio',
              sound: 'sirene',
              notification_priority: 'PRIORITY_MAX',
            },
          },
          webpush: { headers: { Urgency: 'high' } },
        },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('fcm envio %s: %s', r.status, t.slice(0, 120));
      if (/UNREGISTERED|NotRegistered/i.test(t)) {
        await pruneDeadToken(userId, deviceToken);
      }
    }
  } catch (e) {
    console.error('fcm envio falhou:', e.message);
  }
}

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
  // 2b) Telegram + push (Firebase) para quem quer esse alerta e ve o veiculo
  try {
    const users = await db.query(
      "SELECT DISTINCT u.id, u.attributes::jsonb->>'telegramChatId' AS chat, u.attributes::jsonb->>'notificationTokens' AS tokens FROM tc_users u JOIN tc_user_notification un ON un.userid = u.id JOIN tc_notifications n ON n.id = un.notificationid WHERE n.type = 'alarm' AND (n.attributes::jsonb->>'alarms') = $1 AND (u.administrator = true OR EXISTS (SELECT 1 FROM tc_user_device ud WHERE ud.userid = u.id AND ud.deviceid = $2))",
      [alarm, deviceId],
    );
    for (const row of users.rows) {
      if (row.chat) {
        // eslint-disable-next-line no-await-in-loop
        await tg('sendMessage', { chat_id: row.chat, text: `${emoji} ${deviceName}: veiculo ${label}` });
      }
      if (row.tokens) {
        const list = Array.from(
          new Set(
            String(row.tokens)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          ),
        );
        for (const tk of list) {
          // eslint-disable-next-line no-await-in-loop
          await sendFcm(tk, 'LS Autotruck Rastreios', `${emoji} ${deviceName}: veiculo ${label}`, row.id);
        }
      }
    }
  } catch (e) {
    console.error('alerta push/tg erro:', e.message);
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
  console.log(
    'LS connector no ar (telegram + push Firebase %s + vigia de bloqueio)',
    serviceAccount ? 'ON' : 'OFF',
  );
  pollUpdates();
  watchBlocks();
})().catch((e) => {
  console.error('fatal:', e.message);
  process.exit(1);
});
