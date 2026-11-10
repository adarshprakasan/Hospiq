const { createHash } = require('node:crypto');
const { fail } = require('./record-access');

const passwordRule = 'Use at least 15 characters and no more than 72 UTF-8 bytes';

function validPassword(password) {
  return typeof password === 'string' && [...password].length >= 15 && Buffer.byteLength(password) <= 72;
}

async function checkPassword(password) {
  if (!validPassword(password)) throw fail(400, passwordRule);
  if (process.env.NODE_ENV !== 'production' && process.env.CHECK_BREACHED_PASSWORDS !== 'true') return;

  const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
  let matches;
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
      redirect: 'error',
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) throw new Error('Password screening unavailable');
    matches = (await response.text()).split(/\r?\n/);
  } catch {
    throw fail(503, 'Password screening temporarily unavailable');
  }
  if (matches.some(line => {
    const [suffix, count] = line.split(':');
    return suffix === hash.slice(5) && Number(count) > 0;
  })) throw fail(400, 'This password appeared in a breach. Choose a different password');
}

module.exports = { checkPassword, validPassword, passwordRule };
