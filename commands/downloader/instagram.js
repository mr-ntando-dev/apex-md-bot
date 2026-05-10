const { downloadViaApi } = require('../../lib/downloadViaApi');
const { cobaltDownload } = require('../../lib/cobalt');

module.exports = {
  name: 'ig', aliases: ['instagram', 'insta', 'reels'], category: 'downloader',
  desc: 'Download Instagram video/reel', usage: '.ig [URL]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const url = args[0];
    if (!url || !url.includes('instagram.com'))
      return sock.sendMessage(from, { text: '📸 Provide an Instagram URL.\nExample: .ig https://www.instagram.com/reel/...' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⬇️ Downloading Instagram content...' }, { quoted: msg });
    try {
      let buffer, mimetype;
      try {
        const r = await downloadViaApi(url, 'video');
        buffer  = r.buffer; mimetype = r.mimetype;
      } catch {
        buffer  = await cobaltDownload(url);
        mimetype = 'video/mp4';
      }
      return sock.sendMessage(from, { video: buffer, mimetype, caption: '📸 Downloaded via APEX-MD' }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Instagram download failed: ${err.message}` }, { quoted: msg });
    }
  },
};
