const { downloadViaApi } = require('../../lib/downloadViaApi');
const ytdl     = require('@distube/ytdl-core');
const ytSearch = require('yt-search');

module.exports = {
  name: 'spotify', aliases: ['sp', 'spotifydl'], category: 'downloader',
  desc: 'Download a Spotify track audio via YouTube match', usage: '.spotify [track name - artist]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const query = args.join(' ');
    if (!query) return sock.sendMessage(from, { text: '🎵 .spotify Essence - Wizkid' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🎵 Searching: *${query}*...` }, { quoted: msg });
    try {
      const results = await ytSearch(`${query} audio`);
      if (!results.videos.length) return sock.sendMessage(from, { text: '❌ Track not found.' }, { quoted: msg });
      const video = results.videos[0];
      if (parseInt(video.seconds) > 600) return sock.sendMessage(from, { text: '⏱️ Track too long.' }, { quoted: msg });

      let buffer;
      try {
        const r = await downloadViaApi(video.url, 'audio');
        buffer  = r.buffer;
      } catch {
        await sock.sendMessage(from, { text: `⬇️ Downloading: *${video.title}*` }, { quoted: msg });
        const chunks = [];
        await new Promise((res, rej) => {
          const s = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
          s.on('data', c => chunks.push(c));
          s.on('end', res);
          s.on('error', rej);
        });
        buffer = Buffer.concat(chunks);
      }
      return sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  },
};
