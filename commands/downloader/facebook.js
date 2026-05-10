const { downloadViaApi } = require('../../lib/downloadViaApi');
const { cobaltDownload } = require('../../lib/cobalt');

module.exports = {
  name: 'fb', aliases: ['facebook', 'fbvideo'], category: 'downloader',
  desc: 'Download Facebook video', usage: '.fb [URL]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const url = args[0];
    if (!url || !url.includes('facebook.com'))
      return sock.sendMessage(from, { text: '📘 Provide a Facebook video URL.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⬇️ Downloading Facebook video...' }, { quoted: msg });
    try {
      let buffer, mimetype;
      try {
        const r = await downloadViaApi(url, 'video');
        buffer  = r.buffer; mimetype = r.mimetype;
      } catch {
        buffer  = await cobaltDownload(url);
        mimetype = 'video/mp4';
      }
      return sock.sendMessage(from, { video: buffer, mimetype, caption: '📘 Downloaded via APEX-MD' }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Facebook download failed: ${err.message}` }, { quoted: msg });
    }
  },
};
