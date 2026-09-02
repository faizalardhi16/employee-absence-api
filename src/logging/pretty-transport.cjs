'use strict';
/**
 * pretty-transport.cjs — transport console custom untuk pino (multi-target).
 * Memberi warna per level dengan ANSI 256-color (presisi, termasuk oranye)
 * karena pino-pretty bawaan tidak mendukung warna "orange".
 *
 * Warna:
 *  - info    -> hijau
 *  - debug   -> oranye
 *  - warn    -> kuning
 *  - error   -> merah
 *  - trace/fatal -> magenta / merah (terang)
 *
 * Catatan: dalam mode multiple-target pino, tiap target function diharuskan
 * return stream yang bisa di-`.write(msg)`. Kita return Writable yang memformat
 * lalu menulis hasilnya ke process.stdout (console).
 */
const { Writable } = require('node:stream');

// ANSI 256 colors
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const COLOR = {
  green: '\x1b[38;5;40m', // hijau
  orange: '\x1b[38;5;208m', // oranye
  yellow: '\x1b[38;5;226m', // kuning
  red: '\x1b[38;5;196m', // merah
  cyan: '\x1b[38;5;51m',
  magenta: '\x1b[38;5;201m',
  gray: '\x1b[38;5;245m',
  bold: '\x1b[1m',
};

const LEVEL_COLOR = {
  10: COLOR.magenta, // trace
  20: COLOR.orange, // debug
  30: COLOR.green, // info
  40: COLOR.yellow, // warn
  50: COLOR.red, // error
  60: COLOR.red, // fatal
};

const LEVEL_LABEL = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO ',
  40: 'WARN ',
  50: 'ERROR',
  60: 'FATAL',
};

function colorize(level, text) {
  const c = LEVEL_COLOR[level] ?? COLOR.gray;
  return `${c}${COLOR.bold}${text}${RESET}`;
}

function writeToStdout(obj) {
  const level = typeof obj.level === 'number' ? obj.level : 30;
  const time =
    obj.time && typeof obj.time === 'string'
      ? new Date(obj.time).toLocaleTimeString()
      : new Date().toLocaleTimeString();
  const label = LEVEL_LABEL[level] ?? 'LVL' + level;
  const context = obj.context ?? '';
  const msg = obj.msg ?? '';

  let out = `${colorize(level, label)} ${DIM}${time}${RESET} `;

  if (context) out += `${DIM}[${context}]${RESET} `;

  out += `${COLOR.gray}${msg}${RESET}`;

  const ignored = new Set(['level', 'time', 'msg', 'context', 'pid', 'hostname', 'app', 'env', 'v', 'reqId']);
  const meta = [];
  for (const [k, v] of Object.entries(obj)) {
    if (ignored.has(k)) continue;
    let val = v;
    if (typeof v === 'object') {
      try {
        val = JSON.stringify(v);
      } catch {
        val = String(v);
      }
    }
    meta.push(`${DIM}${k}${RESET}=${COLOR.cyan}${val}${RESET}`);
  }
  if (obj.reqId) out += ` ${DIM}reqId=${obj.reqId}${RESET}`;
  if (meta.length) out += ' ' + meta.join(' ');

  process.stdout.write(out + '\n');
}

module.exports = function (opts) {
  return new Writable({
    objectMode: true,
    write(chunk, _enc, cb) {
      // chunk bisa berupa object (parsed) atau string (JSON line)
      let obj = chunk;
      if (typeof chunk === 'string') {
        try {
          obj = JSON.parse(chunk);
        } catch {
          process.stdout.write(chunk + '\n');
          cb();
          return;
        }
      }
      try {
        writeToStdout(obj);
      } catch (err) {
        process.stdout.write(String(err) + '\n');
      }
      cb();
    },
  });
};
