'use strict';
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const level = levels[process.env.LOG_LEVEL || 'info'] ?? 2;
const ts = () => new Date().toISOString();
module.exports = {
  info:  (...a) => level >= 2 && console.log(`[${ts()}] INFO:`, ...a),
  warn:  (...a) => level >= 1 && console.warn(`[${ts()}] WARN:`, ...a),
  error: (...a) => level >= 0 && console.error(`[${ts()}] ERROR:`, ...a),
  debug: (...a) => level >= 3 && console.log(`[${ts()}] DEBUG:`, ...a),
};
