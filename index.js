// ============================================================
//  APEX-MD Bot  ·  Main Entry Point
//  The most advanced WhatsApp Multi-Device Bot — 2026 Edition
//  Built on @whiskeysockets/baileys
//
//  BOT ONLY — no API server in this repo.
//  The REST API lives in apex-md-api (Render).
//  They talk via MongoDB job queue.
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');

const pino       = require('pino');
const fs         = require('fs');
const qrcode     = require('qrcode-terminal');
const config     = require('./config');
const logger     = require('./lib/logger');
const db         = require('./lib/database');
const { handleMessage, loadCommands } = require('./lib/handler');
const { startJobWorker }              = require('./lib/jobWorker');
const startKeepAlive                  = require('./lib/keepAlive');
const { restoreSession }              = require('./lib/session');

// ── Splash ────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════╗
║       ⚡  APEX-MD  WhatsApp Bot  ⚡       ║
║         v${config.BOT_VERSION}  |  2026 Edition          ║
║   The most advanced MD bot ever built    ║
║   API Bridge: MongoDB job queue  🔗      ║
╚══════════════════════════════════════════╝
`);

async function startBot() {
  loadCommands();
  await db.connect();

  if (!fs.existsSync(config.SESSION_DIR)) {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });
  }

  restoreSession();

  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  const { version }          = await fetchLatestBaileysVersion();
  logger.info(`[Boot] Using Baileys v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal:              false,
    logger:                         pino({ level: 'silent' }),
    browser:                        ['APEX-MD', 'Chrome', '120.0.0'],
    markOnlineOnConnect:            true,
    syncFullHistory:                false,
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
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

      startJobWorker(sock);   // poll MongoDB for API jobs
      startKeepAlive();       // ping Render every 14 min

      await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
        text: [
          `⚡ *APEX-MD Online!*`,
          `Version: ${config.BOT_VERSION}`,
          `Prefix: ${config.BOT_PREFIX}`,
          `Mode: ${config.PUBLIC_MODE ? 'Public' : 'Private'}`,
          `API Bridge: ${config.DB_ENABLED ? '🟢 Active' : '🔴 No MongoDB — set MONGODB_URI'}`,
          ``,
          `Type ${config.BOT_PREFIX}help to see commands.`,
        ].join('\n'),
      }).catch(() => {});
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!['add', 'remove'].includes(action)) return;
    const groupData = await db.getGroup(id);
    for (const jid of participants) {
      const name = jid.split('@')[0];
      const meta = await sock.groupMetadata(id).catch(() => null);
      if (action === 'add' && groupData.welcome) {
        const msg = (groupData.welcomeMsg || `Welcome to {group}, @{user}! 👋`)
          .replace('{group}', meta?.subject || 'the group')
          .replace('{user}', name);
        await sock.sendMessage(id, { text: msg, mentions: [jid] });
      }
      if (action === 'remove' && groupData.goodbye) {
        await sock.sendMessage(id, { text: `👋 @${name} has left the group.`, mentions: [jid] });
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message)                            continue;
      if (isJidBroadcast(msg.key.remoteJid || '')) continue;
      if (msg.key.fromMe)                          continue;

      // DB-driven auto-replies
      try {
        const rules = await db.getAllAutoReplies();
        if (rules.length) {
          const body = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || ''
          ).toLowerCase().trim();
          for (const rule of rules) {
            const hit = rule.exact
              ? body === rule.keyword.toLowerCase()
              : body.includes(rule.keyword.toLowerCase());
            if (hit) {
              await sock.sendMessage(msg.key.remoteJid, { text: rule.reply }, { quoted: msg });
              break;
            }
          }
        }
      } catch {}

      await handleMessage(sock, msg);
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
