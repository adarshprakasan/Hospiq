const { spawn } = require('node:child_process');
const { fail } = require('./record-access');
let running = 0;
async function extract(file, spawnProcess = spawn) {
  if (!process.env.TESSERACT_PATH) throw fail(503, 'Text extraction is not configured. You can still upload the document and enter notes manually');
  if (!file || !['image/png', 'image/jpeg'].includes(require('./medical-files').validatedType(file))) throw fail(400, 'Text extraction supports one JPEG or PNG image');
  if (running >= 2) throw fail(429, 'Text extraction is busy. Please retry shortly');
  const language = process.env.OCR_LANGUAGES || 'eng';
  if (!/^[a-z_+]{3,40}$/.test(language)) throw fail(503, 'OCR language configuration is invalid');
  running++;
  try {
    return await new Promise((resolve, reject) => {
      // No shell, disk files or external AI provider. The image stays on this server.
      const child = spawnProcess(process.env.TESSERACT_PATH, ['stdin', 'stdout', '-l', language, '--psm', '3'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      let text = '', exceeded = false;
      const timeout = setTimeout(() => { child.kill(); reject(fail(504, 'Text extraction timed out')); }, 25000);
      child.stdout.on('data', chunk => { text += chunk.toString('utf8'); if (Buffer.byteLength(text) > 64000) { exceeded = true; child.kill(); } });
      child.on('error', () => { clearTimeout(timeout); reject(fail(503, 'The local text extraction engine is unavailable')); });
      child.on('close', code => { clearTimeout(timeout); if (code !== 0 || exceeded) reject(fail(422, 'This image could not be extracted. Try a clearer image or enter notes manually')); else resolve(text.trim().slice(0, 10000)); });
      child.stdin.on('error', () => {});
      child.stdin.end(file.buffer);
    });
  } finally { running--; }
}
module.exports = { extract };
