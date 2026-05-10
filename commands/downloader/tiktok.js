const { downloadViaApi } = require('../../lib/downloadViaApi');
const { cobaltDownload } = require('../../lib/cobalt');

module.exports = {
  name: 'tiktok', aliases: ['tt', 'tik'], category: 'downloader',
  desc: 'Download TikTok video (no watermark)', usage: '.tiktok [URL]',
  public: true,
  async execute({ sock, msg, from, args }) {
    const url = args[0];
    if (!url || !url.includes('tiktok.com'))
      return sock.sendMessage(from, { text: '🎵 Provide a TikTok URL.\nExample: .tiktok https://vm.tiktok.com/...' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⬇️ Downloading TikTok (no watermark)...' }, { quoted: msg });
    try {
      let buffer, mimetype;
      try {
        const r = await downloadViaApi(url, 'video');
        buffer  = r.buffer; mimetype = r.mimetype;
      } catch {
        buffer  = await cobaltDownload(url, { tiktokH265: false });
        mimetype = 'video/mp4';
      }
      return sock.sendMessage(from, { video: buffer, mimetype, caption: '🎵 Downloaded via APEX-MD' }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ TikTok download failed: ${err.message}` }, { quoted: msg });
    }
  },
};
