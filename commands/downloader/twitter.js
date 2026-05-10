const { cobaltDownload } = require('../../lib/cobalt');

module.exports = {
  name: 'twitter', aliases: ['tw', 'tweet', 'x'], category: 'downloader',
  desc: 'Download Twitter/X video', usage: '.twitter [URL]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const url = args[0];
    if (!url || (!url.includes('twitter.com') && !url.includes('x.com')))
      return sock.sendMessage(from, { text: '🐦 Provide a Twitter/X URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⬇️ Downloading Twitter/X video...' }, { quoted: msg });
    try {
      const buffer = await cobaltDownload(url);
      return sock.sendMessage(from, { video: buffer, mimetype: 'video/mp4', caption: '🐦 Downloaded via APEX-MD' }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Twitter download failed: ${err.message}` }, { quoted: msg });
    }
  },
};
