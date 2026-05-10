# ⚡ APEX-MD Bot — 2026 Supreme Edition

**WhatsApp Multi-Device Bot** · Built on [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)

> This repo is the **bot only**. The REST API lives in [apex-md-api](https://github.com/mr-ntando-dev/apex-md-api) and is deployed on Render. They communicate via a **MongoDB job queue** — no direct socket exposure needed.

---

## 🏗️ Architecture

```
┌─────────────────────┐        MongoDB (shared)       ┌──────────────────────┐
│   apex-md-bot       │  ←── reads jobs ────────────  │   apex-md-api        │
│   Panel / VPS       │  ──── writes results ───────→  │   Render (free tier) │
│                     │                                │                      │
│  Baileys socket     │                                │  30 REST endpoints   │
│  200+ commands      │                                │  No Baileys needed   │
│  Guardian AI        │                                │  Stateless           │
│  Job worker         │                                │                      │
└─────────────────────┘                                └──────────────────────┘
```

- **Bot** stays alive on your panel/VPS — holds the WhatsApp session
- **API** on Render wakes up on request, writes jobs to MongoDB
- **Bot worker** picks up jobs every 1s, executes with live socket, writes result back
- **Keep-alive** pinger in the bot pings the Render API every 14 min so it never sleeps

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/mr-ntando-dev/apex-md-bot.git
cd apex-md-bot
npm install
```

### 2. Configure

```bash
cp .env.example .env
nano .env
```

Required minimum:
```env
OWNER_NUMBER=2348012345678
MONGODB_URI=mongodb+srv://...
API_URL=https://your-apex-api.onrender.com
```

### 3. Start

```bash
npm start
```

Scan the QR code: **WhatsApp → Linked Devices → Link Device**

### 4. Panel / VPS (keep alive)

```bash
npm install -g pm2
pm2 start index.js --name apex-md-bot
pm2 save && pm2 startup
```

---

## 🔗 Pairing with apex-md-api

Both repos must share the **same `MONGODB_URI`**. That's the only connection between them.

| Env var | Bot | API (Render) |
|---|---|---|
| `MONGODB_URI` | ✅ required | ✅ required |
| `API_URL` | ✅ required (keep-alive) | ❌ not needed |
| `API_SECRET` | ❌ not needed | ✅ required |

---

## 📋 Commands

200+ commands across 11 categories. Type `.help` in WhatsApp to see the full menu.

| Category | Commands |
|---|---|
| 🤖 AI | `.ai`, `.imagine`, `.analyze`, `.voice`, `.search`, `.debate`, `.roast`, `.code`... |
| 🛡️ Admin | `.warn`, `.kick`, `.promote`, `.demote`, `.tagall`, `.mute`, `.antilink`... |
| 🔒 Protection | `.anticall`, `.antifake`, `.antidemote`, `.antivv`, `.antigm` |
| 🎭 Anime | 26 reaction GIFs via Tenor |
| 📥 Downloaders | YouTube, TikTok, Instagram, Facebook, Twitter, Spotify, Pinterest... |
| 🎮 Games | `.slots`, `.flip`, `.tictactoe`, `.profile`, `.daily`, `.leaderboard`... |
| 🎬 Media | `.sticker`, `.tts`, `.logo`, `.audioeffect`... |
| 🔧 Utility | `.weather`, `.wikipedia`, `.qr`, `.shazam`, `.translate`... |
| 💥 Fun | `.joke`, `.meme`, `.8ball`, `.burn`, `.horoscope`... |
| 💼 Business | `.broadcast`, `.autorespond` |
| 👑 Owner | `.ban`, `.mode`, `.setprefix`, `.restart`, `.install`... |

---

## ⚠️ Legal

Uses the unofficial [Baileys](https://github.com/WhiskeySockets/Baileys) library. Overuse may violate WhatsApp ToS. For production/high-volume use: [WhatsApp Business API](https://business.whatsapp.com/products/business-platform).

---

## 📄 License

MIT
