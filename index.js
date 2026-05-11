// ============================================================
//  APEX-MD Bot  ·  Main Entry Point
//  The most advanced WhatsApp Multi-Device Bot — 2026 Edition
//  Built on @whiskeysockets/baileys
//
//  BOT ONLY — all logic fetched from apex-md-api at runtime.
//  No local lib/ or commands/ needed.
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');

const pino    = require('pino');
const fs      = require('fs');
const qrcode  = require('qrcode-terminal');
const config  = require('./config');

const API_BASE = process.env.API_BASE_URL || 'https://apex-md-api-mi7s.onrender.com';
const API_KEY  = process.env.API_SECRET   || 'e06912e7cc57172ba23a5c73817b50afd414f9aa1bb0ab472bd0d58c9a40b5a3';

// ── Minimal logger (no local lib dependency) ──────────────────
const logger = {
  info:  (...a) => console.log(`[${new Date().toISOString()}] INFO:`, ...a),
  warn:  (...a) => console.warn(`[${new Date().toISOString()}] WARN:`, ...a),
  error: (...a) => console.error(`[${new Date().toISOString()}] ERROR:`, ...a),
};

// ── API helper ────────────────────────────────────────────────
async function apiCall(method, endpoint, body) {
  const fetch = (await import('node-fetch')).default;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}

// ── Splash ────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════╗
║       ⚡  APEX-MD  WhatsApp Bot  ⚡       ║
║         v${config.BOT_VERSION}  |  2026 Edition          ║
║   The most advanced MD bot ever built    ║
║   All commands via API 🔗                ║
╚══════════════════════════════════════════╝
`);

async function startBot() {
  // Verify API is reachable
  try {
    const status = await apiCall('GET', '/api/status');
    logger.info(`[API] Connected to ${status.api} v${status.version}`);
  } catch (e) {
    logger.warn(`[API] Could not reach API: ${e.message} — bot will still run, commands dispatched via DB`);
  }

  if (!fs.existsSync(config.SESSION_DIR)) {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  const { version }          = await fetchLatestBaileysVersion();
  logger.info(`[Boot] Using Baileys v${version.join('.')}`);

  const usePairingCode = process.env.PAIRING_CODE === 'true';

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    // printQRInTerminal removed — deprecated in latest Baileys
    logger:                         pino({ level: 'silent' }),
    browser:                        ['APEX-MD', 'Chrome', '120.0.0'],
    markOnlineOnConnect:            true,
    syncFullHistory:                false,
    generateHighQualityLinkPreview: true,
  });

  // Request pairing code if configured
  if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = String(config.OWNER_NUMBER).replace(/[^0-9]/g, '');
    try {
      const pairingCode = await sock.requestPairingCode(phoneNumber);
      console.log('\n╔══════════════════════════════════╗');
      console.log(`║  ⚡ PAIRING CODE: ${pairingCode.match(/.{1,4}/g).join('-')}  ║`);
      console.log('║  WhatsApp → Linked Devices →     ║');
      console.log('║  Link with phone number instead  ║');
      console.log('╚══════════════════════════════════╝\n');
    } catch (err) {
      logger.warn(`[Pairing] Could not get pairing code: ${err.message}`);
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      console.log('\n📱 Scan this QR code with WhatsApp (Linked Devices > Link Device):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const code      = lastDisconnect?.error?.output?.statusCode;
      const reason    = lastDisconnect?.error?.output?.payload?.error;
      const loggedOut = code === DisconnectReason.loggedOut;
      logger.warn(`[Connection] Closed. Code: ${code} | Reason: ${reason}`);
      if (loggedOut) {
        logger.error('[Connection] Logged out! Delete ./session and restart.');
        process.exit(1);
      } else {
        logger.info('[Connection] Reconnecting in 5s...');
        setTimeout(startBot, 5000);
      }
    }

    if (connection === 'open') {
      logger.info(`[Connection] ✅ APEX-MD online as ${sock.user?.id}`);

      // Start keep-alive pinger to API
      setInterval(async () => {
        try { await apiCall('GET', '/ping'); } catch {}
      }, 14 * 60 * 1000);

      await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
        text: [
          `⚡ *APEX-MD Online!*`,
          `Version: ${config.BOT_VERSION}`,
          `Prefix: ${config.BOT_PREFIX}`,
          `Mode: ${config.PUBLIC_MODE ? 'Public' : 'Private'}`,
          `API: 🟢 ${API_BASE}`,
          ``,
          `Type ${config.BOT_PREFIX}help to see commands.`,
        ].join('\n'),
      }).catch(() => {});
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!['add', 'remove'].includes(action)) return;
    try {
      await apiCall('POST', '/api/auto-welcome', { groupId: id, participants, action });
    } catch {}
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message)                            continue;
      if (isJidBroadcast(msg.key.remoteJid || '')) continue;
      if (msg.key.fromMe)                          continue;

      const from   = msg.key.remoteJid;
      const sender = from.endsWith('@g.us') ? msg.key.participant : from;
      const body   = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ''
      ).trim();

      // ── Auto-read ──────────────────────────────────────
      if (config.AUTO_READ) await sock.readMessages([msg.key]).catch(() => {});

      // ── Auto-typing for commands ───────────────────────
      if (config.AUTO_TYPING && body.startsWith(config.BOT_PREFIX)) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
      }

      // ── Route everything to API ────────────────────────
      try {
        await apiCall('POST', '/api/handle-message', {
          from,
          sender,
          body,
          isGroup:    from.endsWith('@g.us'),
          key:        msg.key,
          message:    msg.message,
          pushName:   msg.pushName || '',
        });
      } catch (e) {
        // If API fails for a command, notify user
        if (body.startsWith(config.BOT_PREFIX)) {
          await sock.sendMessage(from, {
            text: `⚠️ Command could not be processed. API may be offline.`
          }, { quoted: msg }).catch(() => {});
        }
      }
    }
  });

  sock.ev.on('messages.delete', () => {
    if (config.ANTI_DELETE) logger.info('[AntiDelete] A message was deleted.');
  });

  return sock;
}

startBot().catch(err => {
  logger.error('[FATAL]', err);
  process.exit(1);
});
