const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
test('OCR uses a local process without a shell and returns text for review', async () => {
  const previous = process.env.TESSERACT_PATH;
  process.env.TESSERACT_PATH = '/fictional/tesseract';
  try {
    const text = await require('../services/ocr').extract({ mimetype: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10]) }, (command, args, options) => {
      assert.equal(command, '/fictional/tesseract'); assert.equal(options.shell, undefined); assert.deepEqual(args.slice(0, 2), ['stdin', 'stdout']);
      const child = new EventEmitter(); child.stdout = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
      child.stdin.on('finish', () => { child.stdout.write('Fictional extracted text'); child.emit('close', 0); });
      return child;
    });
    assert.equal(text, 'Fictional extracted text');
  } finally { if (previous === undefined) delete process.env.TESSERACT_PATH; else process.env.TESSERACT_PATH = previous; }
});
