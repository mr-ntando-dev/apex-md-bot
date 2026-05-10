const { downloadViaApi } = require('../../lib/downloadViaApi');
const { cobaltDownload } = require('../../lib/cobalt');

module.exports = {
  name: 'twitter', aliases: ['tw', 'tweet', 'x'], category: 'downloader',
  desc: 'Download Twitter/X video', usage: '.twitter [URL]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const url = args[0];
    if (!url || (!url.includes('twitter.com') && !url.includes('x.com')))
      return sock.sendMessage(from, { text: '🐦 Provide a Twitter/X post URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⬇️ Downloading Twitter/X video...' }, { quoted: msg });
    try {
      let buffer, mimetype;
      try {
        const r = await downloadViaApi(url, 'video');
        buffer  = r.buffer; mimetype = r.mimetype;
      } catch {
        buffer  = await cobaltDownload(url);
        mimetype = 'video/mp4';
      }
      return sock.sendMessage(from, { video: buffer, mimetype, caption: '🐦 Downloaded via APEX-MD' }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Twitter download failed: ${err.message}` }, { quoted: msg });
    }
  },
};
